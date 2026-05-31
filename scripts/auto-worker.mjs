/**
 * 自动化 Worker：按每日时间表扫 WhatsApp（默认 10:00、15:00）
 *
 * 用法: npm run auto
 * 环境: HUB_URL=http://localhost:3000
 */
import { scanWhatsAppOnce } from "./wa-auto-scan.mjs";
import {
  parseSchedule,
  currentSlotKey,
  msUntilNextScan,
  formatScheduleLabel,
  DEFAULT_SCHEDULE,
} from "./schedule-utils.mjs";

const HUB = process.env.HUB_URL || "http://localhost:3000";

async function getState() {
  try {
    const res = await fetch(`${HUB}/api/automation`);
    const json = await res.json();
    return json.data?.state;
  } catch {
    return {
      enabled: true,
      scanMode: "schedule",
      scanSchedule: JSON.stringify(DEFAULT_SCHEDULE),
    };
  }
}

async function patchState(data) {
  await fetch(`${HUB}/api/automation`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

function shouldRunNow(state) {
  const mode = state?.scanMode ?? "schedule";
  if (mode === "interval") return true;

  const slot = currentSlotKey(state?.scanSchedule);
  if (!slot) return false;
  if (state?.lastScanSlot === slot) return false;
  return true;
}

async function loop() {
  console.log(`[auto-worker] hub=${HUB}`);
  console.log(`[auto-worker] 模式：每日定点扫描（默认 10:00、15:00 本地时间）`);

  while (true) {
    const state = await getState();
    const schedule = state?.scanSchedule;
    const mode = state?.scanMode ?? "schedule";

    if (state?.enabled === false) {
      console.log("[auto-worker] 自动扫描已暂停（看板 /automation 可开启）");
      await new Promise((r) => setTimeout(r, 60000));
      continue;
    }

    if (mode === "interval") {
      const interval = state?.scanIntervalMs ?? 300000;
      try {
        await scanWhatsAppOnce();
      } catch (e) {
        console.error("[auto-worker] scan error:", e.message);
        await patchState({ lastScanStatus: "error", lastScanSummary: e.message });
      }
      console.log(`[auto-worker] 间隔模式：${Math.round(interval / 60000)} 分钟后再次扫描…`);
      await new Promise((r) => setTimeout(r, interval));
      continue;
    }

    // 定点模式：等到下一时刻，在 ±2 分钟窗口内执行
    const waitMs = msUntilNextScan(schedule);
    const nextLabel = new Date(Date.now() + waitMs).toLocaleString("zh-CN");
    console.log(
      `[auto-worker] 计划 ${formatScheduleLabel(schedule)} · 下次扫描约 ${nextLabel}`
    );

    await new Promise((r) => setTimeout(r, Math.min(waitMs, 60000)));

    const fresh = await getState();
    if (fresh?.enabled === false) continue;

    if (shouldRunNow(fresh)) {
      const slot = currentSlotKey(fresh?.scanSchedule);
      console.log(`[auto-worker] 到达计划时段 ${slot}，开始扫描…`);
      try {
        await patchState({ lastScanStatus: "running", lastScanSummary: `计划扫描 ${slot}` });
        const result = await scanWhatsAppOnce();
        if (result.ok) {
          await patchState({
            lastScanSlot: slot,
            lastScanStatus: "success",
          });
        }
      } catch (e) {
        console.error("[auto-worker] scan error:", e.message);
        await patchState({ lastScanStatus: "error", lastScanSummary: e.message });
      }
    }
  }
}

loop();
