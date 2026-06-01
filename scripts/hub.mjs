/**
 * 一键启动：看板 + 自动 Worker（含启动补扫）
 *
 * 用法: npm run hub
 */
import { spawn } from "node:child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const HUB = process.env.HUB_URL || "http://localhost:3000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHub(maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${HUB}/api/automation`);
      if (res.ok) return true;
    } catch {
      /* not ready */
    }
    await sleep(1500);
  }
  return false;
}

console.log("═══════════════════════════════════════════");
console.log(" WhatsApp 客户看板 · 一键启动");
console.log(" 看板: " + HUB);
console.log(" 流程: 扫描 → 流水线 → LinkedIn → 草稿");
console.log("═══════════════════════════════════════════\n");

const dev = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

dev.on("error", (e) => {
  console.error("[hub] 无法启动 dev:", e.message);
  process.exit(1);
});

console.log("[hub] 等待看板就绪…");
const ready = await waitForHub();
if (!ready) {
  console.error("[hub] 看板未在 90s 内就绪，请检查端口是否被占用");
  process.exit(1);
}
console.log("[hub] 看板已就绪 ✓\n");

const auto = spawn(process.execPath, [join(ROOT, "scripts", "auto-worker.mjs")], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    HUB_URL: HUB,
    AUTO_SCAN_ON_START: process.env.AUTO_SCAN_ON_START ?? "1",
  },
});

function shutdown() {
  console.log("\n[hub] 正在关闭…");
  auto.kill("SIGTERM");
  dev.kill("SIGTERM");
  setTimeout(() => process.exit(0), 800);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

auto.on("exit", (code) => {
  console.log(`[hub] auto-worker 退出 (${code})`);
  dev.kill("SIGTERM");
  process.exit(code ?? 0);
});

dev.on("exit", (code) => {
  console.log(`[hub] dev 退出 (${code})`);
  auto.kill("SIGTERM");
  process.exit(code ?? 0);
});
