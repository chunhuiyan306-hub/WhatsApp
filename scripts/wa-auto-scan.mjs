/**
 * 单次扫描 WhatsApp Web 未读会话 → POST /api/ingest（auto 流水线）
 *
 * 首次运行会打开浏览器，需手机扫码登录；会话保存在 .wa-browser-data/
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const HUB = process.env.HUB_URL || "http://localhost:3000";
const USER_DATA = join(ROOT, ".wa-browser-data");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function hub(path, opts = {}) {
  const res = await fetch(`${HUB}${path}`, opts);
  return res.json();
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

function parsePhone(raw) {
  if (!raw) return null;
  const m = raw.match(/\+[\d\s\-()]+/);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

export async function scanWhatsAppOnce() {
  if (!existsSync(USER_DATA)) mkdirSync(USER_DATA, { recursive: true });

  await logAutomation("scan", "running", "正在启动浏览器…");

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

  // 等待登录或聊天列表
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
      "WhatsApp 未登录：请在打开的浏览器窗口扫码，然后重新运行"
    );
    await context.close();
    return { ok: false, reason: "not_logged_in" };
  }

  // 尝试点「未读」标签
  try {
    const unreadTab = page.getByRole("tab", { name: /Unread/i });
    if (await unreadTab.count()) await unreadTab.first().click();
  } catch {
    /* optional */
  }

  await page.waitForTimeout(2000);

  // 读取会话列表
  const chatRows = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[role="listitem"]')];
    return items
      .map((el) => {
        const text = el.innerText || "";
        const phoneMatch = text.match(/\+[\d\s\-()]+/);
        if (!phoneMatch) return null;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const phone = phoneMatch[0].trim();
        const preview = lines.slice(1).join(" ").slice(0, 500);
        return { phone, preview, full: text.slice(0, 300) };
      })
      .filter(Boolean);
  });

  const seen = new Set();
  const unique = chatRows.filter((c) => {
    const key = c.phone.replace(/\D/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`发现 ${unique.length} 个会话`);

  let ingested = 0;
  let errors = 0;

  for (const row of unique) {
    try {
      // 点击会话
      const cell = page.locator('[role="gridcell"]').filter({ hasText: row.phone });
      if ((await cell.count()) === 0) continue;
      await cell.first().click();
      await page.waitForTimeout(1500);

      // 读消息
      const messages = await page.evaluate(() => {
        const nodes = [
          ...document.querySelectorAll('[data-testid="msg-container"]'),
          ...document.querySelectorAll(".message-in, .message-out"),
        ];
        const texts = nodes
          .map((n) => n.innerText?.trim())
          .filter((t) => t && t.length > 2 && t.length < 2000);
        return [...new Set(texts)].slice(-8);
      });

      const preview = row.preview || messages[messages.length - 1] || "";
      const inMsg = messages.filter(Boolean);
      const latestIn = inMsg[inMsg.length - 1] || preview;

      // 联系人资料
      let waProfileName = null;
      let isBusinessAccount = false;
      let businessName = null;
      let sourceHint = null;

      try {
        const headerBtn = page
          .locator("header")
          .getByRole("button")
          .filter({ hasText: row.phone });
        if (await headerBtn.count()) {
          await headerBtn.first().click();
          await page.waitForTimeout(800);
          const panelText = await page.evaluate(() => {
            const h = document.body.innerText.match(
              /Contact info[\s\S]{0,500}/
            );
            return h ? h[0] : "";
          });
          const nameMatch = panelText.match(/~\s*([^\n+]+)/);
          if (nameMatch) waProfileName = nameMatch[1].trim();
          if (/business account/i.test(panelText)) isBusinessAccount = true;
          const bizMatch = panelText.match(
            /Contact info\n\+[^\n]+\n([^\n~+]+)\n/
          );
          if (bizMatch && !bizMatch[1].includes("Add")) businessName = bizMatch[1].trim();
          await page.keyboard.press("Escape");
        }
      } catch {
        /* profile optional */
      }

      if (/instagram/i.test(await page.content())) sourceHint = "instagram";
      if (/facebook/i.test(await page.content())) sourceHint = "facebook";

      const payload = {
        auto: true,
        customer: {
          phone: row.phone.replace(/\s/g, ""),
          waChatId: row.phone,
          name: waProfileName || undefined,
        },
        messages: latestIn
          ? [
              {
                direction: "in",
                originalText: latestIn,
              },
            ]
          : [],
        waProfileName: waProfileName || undefined,
        isBusinessAccount,
        businessName: businessName || undefined,
        sourceHint,
      };

      const res = await hub("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        ingested++;
        console.log(`✓ ingest ${row.phone}`);
      } else {
        errors++;
        console.warn(`✗ ${row.phone}`, res);
      }
    } catch (e) {
      errors++;
      console.warn(`✗ ${row.phone}`, e.message);
    }
  }

  await context.close();

  const summary = `扫描完成：${unique.length} 会话，写入 ${ingested}，失败 ${errors}`;
  await logAutomation("scan", "success", summary);

  return { ok: true, chats: unique.length, ingested, errors };
}

// CLI
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
