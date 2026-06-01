/**
 * 扫描 WhatsApp Web 最近 N 个会话，各读最近 M 条消息 → POST /api/ingest
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const HUB = process.env.HUB_URL || "http://localhost:3000";
const USER_DATA = join(ROOT, ".wa-browser-data");
const MAX_CHATS = Number(process.env.SCAN_MAX_CHATS || 30);
const MSG_LIMIT = Number(process.env.SCAN_MSG_LIMIT || 10);
const KEEP_OPEN =
  process.env.SCAN_KEEP_OPEN === "1" || process.argv.includes("--keep-open");
const CHAT_DELAY_MS = Number(process.env.SCAN_CHAT_DELAY_MS || 1000);
const HUB_TIMEOUT_MS = Number(process.env.SCAN_HUB_TIMEOUT_MS || 90000);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** 系统/筛选行，非真实客户会话 */
const SKIP_TITLES =
  /^(whatsapp business|community|official account|archived|all|unread|locked chats?|starred messages?)$/i;

const SKIP_TITLE_PARTIAL =
  /whatsapp business on web|community|official account|\d+ members|\d+ participants|群公告/i;

/** 纯时间 / 纯未读数 — 不能当客户名 */
const JUNK_TITLE = /^(\d{1,2}:\d{2}(?:\s*[AP]M)?|\d{1,2}\/\d{1,2}\/\d{2,4}|yesterday|today|\d+|•|\u200e)$/i;

function cleanChatTitle(title, phone) {
  let t = (title || "")
    .replace(/^\d+\s+unread\s+messages?\s*/i, "")
    .replace(/^1 unread message\s*/i, "")
    .trim();
  if (!t || JUNK_TITLE.test(t)) t = phone || title || "";
  return t.trim();
}

/** 去掉列表里误吸的时间尾缀（如 +966 59 562 2005 14 里的 14） */
function sanitizePhone(raw) {
  if (!raw) return null;
  let p = raw.trim();
  // 末尾空格+1~2位数字，通常是时间而非号码
  p = p.replace(/\s+\d{1,2}$/, "");
  // 去掉多余空格
  p = p.replace(/\s+/g, " ").trim();
  return p || null;
}

function scannerHeaders(extra = {}) {
  const secret = process.env.INGEST_SECRET?.trim();
  return {
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    ...extra,
  };
}

async function hub(path, opts = {}, retries = 4) {
  let last = { ok: false, error: "no attempt" };
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${HUB}${path}`, {
        ...opts,
        headers: scannerHeaders(opts.headers || {}),
        signal: AbortSignal.timeout(HUB_TIMEOUT_MS),
      });
      const text = await res.text();
      if (!text) {
        last = { ok: false, error: "empty response" };
      } else {
        try {
          last = JSON.parse(text);
          if (last.ok) return last;
        } catch {
          last = { ok: false, error: "invalid json", raw: text.slice(0, 200) };
        }
      }
    } catch (e) {
      last = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
    if (i < retries - 1) await sleep(1200 * (i + 1));
  }
  return last;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function logAutomation(action, status, summary, detail) {
  try {
    await hub("/api/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastScanStatus: status, lastScanSummary: summary }),
    });
  } catch {
    /* hub offline */
  }
  console.log(`[${action}] ${status}: ${summary}`);
  if (detail) console.log(detail);
}

/** 等待聊天列表出现 */
async function waitForChatList(page) {
  for (let i = 0; i < 30; i++) {
    const n = await page.evaluate(() => {
      const pane = document.querySelector("#pane-side");
      if (!pane) return 0;
      return pane.querySelectorAll('[data-testid="cell-frame-container"]').length;
    });
    if (n > 0) return true;
    await page.waitForTimeout(2000);
  }
  return false;
}

/** 读取列表顶部最近 N 个会话（滚动加载 + 正确解析标题） */
async function collectRecentChats(page) {
  await page.evaluate(() => {
    const pane = document.querySelector("#pane-side");
    if (pane) pane.scrollTop = 0;
  });
  await page.waitForTimeout(600);

  const collected = new Map();

  for (let round = 0; round < 25 && collected.size < MAX_CHATS; round++) {
    const batch = await page.evaluate(() => {
      const pane = document.querySelector("#pane-side");
      if (!pane) return [];

      const cells = pane.querySelectorAll('[data-testid="cell-frame-container"]');
      const out = [];

      for (const cell of cells) {
        const titleEl =
          cell.querySelector('[data-testid="cell-frame-title"]') ||
          cell.querySelector('span[dir="auto"][title]') ||
          cell.querySelector('span[dir="auto"]');
        let title =
          titleEl?.getAttribute("title")?.trim() ||
          titleEl?.textContent?.trim() ||
          "";

        // 去掉 WhatsApp 未读前缀（有时混入 title 文本）
        title = title.replace(/^\d+\s+unread\s+messages?\s*/i, "").trim();

        const secondary =
          cell.querySelector('[data-testid="cell-frame-secondary"]')?.textContent?.trim() ||
          "";

        const fullText = cell.innerText || "";
        const phoneMatch = fullText.match(/\+[\d][\d\s\-()]{7,}/);
        let phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : null;
        // 去掉末尾误匹配的时间数字（如 +966 59 562 2005 14）
        if (phone) phone = phone.replace(/\s+\d{1,2}$/, "").trim();

        // 标题像电话但 title 是昵称时保留 title
        if (!title && phone) title = phone;

        out.push({
          title,
          phone,
          preview: secondary.slice(0, 500),
          fullText: fullText.slice(0, 300),
        });
      }
      return out;
    });

    for (const row of batch) {
      let title = cleanChatTitle(row.title, row.phone);
      if (!title) continue;

      if (SKIP_TITLES.test(title) || SKIP_TITLE_PARTIAL.test(title)) continue;
      if (JUNK_TITLE.test(title)) continue;

      const key = row.phone
        ? row.phone.replace(/\D/g, "")
        : `name:${title.toLowerCase()}`;

      if (!collected.has(key)) {
        collected.set(key, {
          title,
          phone: row.phone,
          preview: row.preview,
          key,
        });
      }
      if (collected.size >= MAX_CHATS) break;
    }

    if (collected.size >= MAX_CHATS) break;

    const scrolled = await page.evaluate(() => {
      const pane = document.querySelector("#pane-side");
      if (!pane) return false;
      const prev = pane.scrollTop;
      pane.scrollTop += 350;
      return pane.scrollTop > prev;
    });
    if (!scrolled) break;
    await page.waitForTimeout(350);
  }

  // 回到顶部（最近会话在顶部）
  await page.evaluate(() => {
    const pane = document.querySelector("#pane-side");
    if (pane) pane.scrollTop = 0;
  });
  await page.waitForTimeout(400);

  return [...collected.values()].slice(0, MAX_CHATS);
}

async function openChat(page, row) {
  const pane = page.locator("#pane-side");
  const needles = [row.title, row.phone].filter(Boolean);

  for (const needle of needles) {
    const cell = pane
      .locator('[data-testid="cell-frame-container"]')
      .filter({ hasText: needle });
    if ((await cell.count()) > 0) {
      await cell.first().click();
      await page.waitForTimeout(1400);
      return true;
    }
  }

  // 兜底：listitem
  for (const needle of needles) {
    const item = pane.locator('[role="listitem"]').filter({ hasText: needle });
    if ((await item.count()) > 0) {
      await item.first().click();
      await page.waitForTimeout(1400);
      return true;
    }
  }

  return false;
}

async function readMessages(page) {
  await page.evaluate(() => {
    const main =
      document.querySelector("#main") ||
      document.querySelector('[data-testid="conversation-panel-body"]');
    if (main) main.scrollTop = main.scrollHeight;
  });
  await page.waitForTimeout(700);

  return page.evaluate((limit) => {
    const nodes = [
      ...document.querySelectorAll('[data-testid="msg-container"]'),
      ...document.querySelectorAll(".message-in, .message-out"),
      ...document.querySelectorAll('[data-testid^="msg-"]'),
    ];
    const out = [];
    const seen = new Set();

    for (const n of nodes) {
      // 跳过系统提示（广告来源、加密通知等）内的嵌套
      if (n.closest('[data-testid="msg-system"]')) continue;

      let text = "";
      const textEl =
        n.querySelector('[data-testid="msg-text"] span') ||
        n.querySelector(".selectable-text") ||
        n.querySelector('[dir="ltr"], [dir="auto"]');
      if (textEl) text = textEl.textContent?.trim() || "";
      else text = n.innerText?.trim() || "";

      if (!text || text.length < 2 || text.length > 4000) continue;
      if (/^(today|yesterday|messages and calls are end-to-end)/i.test(text))
        continue;

      const key = text.slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);

      let direction = "in";
      const testId = n.getAttribute("data-testid") || "";
      if (
        testId.includes("out") ||
        n.classList?.contains("message-out") ||
        n.closest(".message-out") ||
        n.querySelector('[data-icon="msg-dblcheck"], [data-icon="msg-check"]')
          ?.closest('[class*="message-out"]')
      ) {
        direction = "out";
      }
      if (
        n.classList?.contains("message-in") ||
        n.closest(".message-in") ||
        testId.includes("-in")
      ) {
        direction = "in";
      }

      out.push({ direction, originalText: text });
    }
    return out.slice(-limit);
  }, MSG_LIMIT);
}

async function readContactInfo(page, row) {
  let waProfileName = row.title;
  let phone = row.phone;
  let isBusinessAccount = false;
  let businessName = null;

  try {
    const header = page.locator("#main header, [data-testid=\"conversation-header\"]");
    const headerBtn = header.getByRole("button").first();
    if (await headerBtn.count()) {
      await headerBtn.click();
      await page.waitForTimeout(900);
      const info = await page.evaluate(() => document.body.innerText.slice(0, 3000));
      const phoneM = info.match(/\+[\d\s\-()]{8,}/);
      if (phoneM) phone = phoneM[0].replace(/\s+/g, " ").trim();
      const nameM = info.match(/~\s*([^\n+]+)/);
      if (nameM) waProfileName = nameM[1].trim();
      if (/business account/i.test(info)) isBusinessAccount = true;
      if (/facebook/i.test(info)) isBusinessAccount = true;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  } catch {
    /* optional */
  }

  return { waProfileName, phone, isBusinessAccount, businessName };
}

async function detectSourceHint(page) {
  const text = await page.evaluate(() => {
    const main = document.querySelector("#main");
    return main?.innerText?.slice(0, 2000) ?? "";
  });
  if (/instagram/i.test(text)) return "instagram";
  if (/facebook/i.test(text)) return "facebook";
  return null;
}

export async function scanWhatsAppOnce() {
  if (!existsSync(USER_DATA)) mkdirSync(USER_DATA, { recursive: true });

  await logAutomation(
    "scan",
    "running",
    `正在扫描最近 ${MAX_CHATS} 个会话，各 ${MSG_LIMIT} 条消息…`
  );

  const context = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    userAgent: UA,
    locale: "en-US",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.goto("https://web.whatsapp.com/", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  let ready = false;
  for (let i = 0; i < 24; i++) {
    ready = await page.evaluate(
      () =>
        !!document.querySelector("#pane-side") ||
        !!document.querySelector('[data-testid="chat-list"]')
    );
    if (ready) break;
    await page.waitForTimeout(5000);
  }

  if (!ready) {
    await logAutomation(
      "scan",
      "error",
      "WhatsApp 未登录：请在弹出的 Chrome 窗口扫码，然后重新扫描"
    );
    if (!KEEP_OPEN) await context.close();
    return { ok: false, reason: "not_logged_in" };
  }

  const listReady = await waitForChatList(page);
  if (!listReady) {
    await logAutomation(
      "scan",
      "error",
      "聊天列表为空：请确认 Chrome 已登录 WhatsApp"
    );
    if (!KEEP_OPEN) await context.close();
    return { ok: false, reason: "empty_list" };
  }

  // 确保在「All / 全部」，不是 Unread 子集
  try {
    const allTab = page.getByRole("tab", { name: /^All$|^全部$/i });
    if (await allTab.count()) {
      await allTab.first().click();
      await page.waitForTimeout(1000);
    }
  } catch {
    /* optional */
  }

  const unique = await collectRecentChats(page);
  console.log(`发现 ${unique.length} 个最近会话（上限 ${MAX_CHATS}，各 ${MSG_LIMIT} 条）`);
  unique.slice(0, 8).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title}${r.phone ? ` (${r.phone})` : ""}`);
  });
  if (unique.length > 8) console.log(`  … 共 ${unique.length} 个`);

  let ingested = 0;
  let errors = 0;
  let skipped = 0;
  /** @type {string[]} */
  const ingestedCustomerIds = [];
  /** @type {Array<{ row: object; displayName: string }>} */
  const failedRows = [];

  async function ingestOne(row, index, total, retry = false) {
    const opened = await openChat(page, row);
    if (!opened) {
      skipped++;
      console.warn(`跳过（无法打开）: ${row.title}`);
      return false;
    }

    const messages = await readMessages(page);
    const contact = await readContactInfo(page, row);
    const sourceHint = await detectSourceHint(page);

    const displayName = cleanChatTitle(
      contact.waProfileName || row.title,
      contact.phone || row.phone
    );
    const phone = sanitizePhone(contact.phone || row.phone);
    const chatId = phone || displayName;

    const payload = {
      auto: true,
      forceEnrich: true,
      customer: {
        phone: phone?.replace(/\s/g, "") || undefined,
        waChatId: chatId,
        name: displayName,
      },
      messages:
        messages.length > 0
          ? messages.map((m) => ({
              direction: m.direction,
              originalText: m.originalText,
            }))
          : row.preview
            ? [{ direction: "in", originalText: row.preview }]
            : [],
      waProfileName: displayName,
      isBusinessAccount: contact.isBusinessAccount,
      businessName: contact.businessName || undefined,
      sourceHint,
    };

    const res = await hub(
      "/api/ingest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      retry ? 5 : 4
    );

    if (res.ok) {
      ingested++;
      const cid = res.data?.customer?.id;
      if (cid && !ingestedCustomerIds.includes(cid)) {
        ingestedCustomerIds.push(cid);
      }
      const tag = retry ? "↻" : "✓";
      console.log(`${tag} [${index + 1}/${total}] ${displayName}`);
      return true;
    }

    errors++;
    console.warn(`✗ ${displayName}`, res.error || res);
    failedRows.push({ row, displayName });
    return false;
  }

  for (let i = 0; i < unique.length; i++) {
    try {
      await ingestOne(unique[i], i, unique.length);
      await page.waitForTimeout(CHAT_DELAY_MS);
    } catch (e) {
      errors++;
      console.warn(`✗ ${unique[i].title}`, e.message);
      failedRows.push({ row: unique[i], displayName: unique[i].title });
    }
  }

  // 失败会话补扫一轮
  if (failedRows.length > 0) {
    console.log(`[scan] 补扫 ${failedRows.length} 个失败会话…`);
    await sleep(2000);
    const retryList = [...failedRows];
    failedRows.length = 0;
    for (let i = 0; i < retryList.length; i++) {
      const { row } = retryList[i];
      errors--;
      try {
        const ok = await ingestOne(row, i, retryList.length, true);
        if (!ok) errors++;
        await page.waitForTimeout(CHAT_DELAY_MS + 400);
      } catch (e) {
        errors++;
        console.warn(`✗ 补扫 ${row.title}`, e.message);
      }
    }
  }

  if (!KEEP_OPEN) {
    await context.close();
  } else {
    console.log("[scan] 扫描完成，Chrome 窗口保持打开。");
  }

  const summary = `扫描 ${unique.length} 会话：写入 ${ingested}，失败 ${errors}，跳过 ${skipped}`;
  await logAutomation("scan", "success", summary);

  let research = null;
  if (ingestedCustomerIds.length > 0) {
    console.log(
      `[scan] LinkedIn 背景检索（${ingestedCustomerIds.length} 人）…`
    );
    try {
      research = await hub(
        "/api/research/linkedin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerIds: ingestedCustomerIds }),
        },
        2
      );
      const rs = research.data?.summary ?? "LinkedIn 检索完成";
      console.log(`[scan] ${rs}`);
      await logAutomation("research", "success", rs);
    } catch (e) {
      console.warn("[scan] LinkedIn 检索失败:", e.message);
    }
  }

  return {
    ok: true,
    chats: unique.length,
    ingested,
    errors,
    skipped,
    chatTitles: unique.map((r) => r.title),
    research,
    ingestedCustomerIds,
  };
}

if (process.argv[1]?.includes("wa-auto-scan")) {
  scanWhatsAppOnce()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.ok ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      logAutomation("scan", "error", e.message);
      process.exit(1);
    });
}
