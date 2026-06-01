/**
 * 自动化 Worker：按每日时间表扫 WhatsApp（默认 10:00、15:00）
 */
import { scanWhatsAppOnce } from "./wa-auto-scan.mjs";
import { loadLocalEnv } from "./load-env.mjs";
import {
  parseSchedule,
  currentSlotKey,
  msUntilNextScan,
  formatScheduleLabel,
  DEFAULT_SCHEDULE,
} from "./schedule-utils.mjs";

loadLocalEnv();

const HUB = process.env.HUB_URL || "http://localhost:3000";
const STARTUP_SCAN_HOURS = Number(process.env.STARTUP_SCAN_HOURS || 3);

async function clearStaleRunning(state) {
  if (state?.lastScanStatus !== "running" || !state?.lastScanAt) return state;
  const mins = (Date.now() - new Date(state.lastScanAt).getTime()) / 60000;
  if (mins <= 25) return state;
  console.warn(`[auto-worker] 上次扫描 ${Math.round(mins)} 分钟前仍为 running，已重置`);
  await patchState({
    lastScanStatus: "error",
    lastScanSummary: "扫描超时未完成（>25min），已自动重置，可重新扫描",
  });
  return { ...state, lastScanStatus: "error" };
}

async function startupCatchUp(state) {
  if (process.env.AUTO_SCAN_ON_START === "0") {
    console.log("[auto-worker] AUTO_SCAN_ON_START=0，跳过启动补扫");
    return;
  }
  state = await clearStaleRunning(state);
  if (state?.lastScanStatus === "running") {
    console.log("[auto-worker] 扫描进行中，跳过启动补扫");
    return;
  }
  const last = state?.lastScanAt ? new Date(state.lastScanAt) : null;
  const hoursSince = last ? (Date.now() - last.getTime()) / 3600000 : 999;
  if (hoursSince < STARTUP_SCAN_HOURS) {
    console.log(
      `[auto-worker] 距上次扫描 ${hoursSince.toFixed(1)}h，跳过启动补扫（阈值 ${STARTUP_SCAN_HOURS}h）`
    );
    return;
  }
  console.log(`[auto-worker] 启动补扫：距上次扫描 ${hoursSince.toFixed(1)}h…`);
  try {
    await patchState({
      lastScanStatus: "running",
      lastScanSummary: "Worker 启动自动补扫…",
    });
    const result = await scanWhatsAppOnce();
    if (!result.ok) {
      await patchState({
        lastScanStatus: "error",
        lastScanSummary: result.reason ?? "启动补扫失败",
      });
    }
  } catch (e) {
    console.error("[auto-worker] 启动补扫失败:", e.message);
    await patchState({ lastScanStatus: "error", lastScanSummary: e.message });
  }
}

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
  console.log(`[auto-worker] 完整流程：WhatsApp → 流水线 → LinkedIn（扫描脚本内置）`);

  const initial = await clearStaleRunning(await getState());
  await startupCatchUp(initial);

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
