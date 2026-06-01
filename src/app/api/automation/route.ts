import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import {
  DEFAULT_SCHEDULE,
  getNextScanAt,
  formatScheduleLabel,
  parseSchedule,
} from "@/lib/schedule";
import { requireApiUser } from "@/lib/user-role";

const DEFAULT_STATE = {
  id: "default",
  enabled: true,
  scanMode: "schedule",
  scanSchedule: JSON.stringify(DEFAULT_SCHEDULE),
  scanIntervalMs: 300000,
  lastScanAt: null,
  lastScanSlot: null,
  lastScanStatus: "idle",
  lastScanSummary: null,
};

/** GET /api/automation  自动化状态与最近日志 */
export async function GET() {
  let state = await prisma.automationState.findUnique({
    where: { id: "default" },
  });

  if (!state) {
    state = await prisma.automationState.create({ data: DEFAULT_STATE });
  }

  // 超过 25 分钟仍为 running → 视为卡死，自动重置
  if (state.lastScanStatus === "running" && state.lastScanAt) {
    const mins =
      (Date.now() - new Date(state.lastScanAt).getTime()) / 60000;
    if (mins > 25) {
      state = await prisma.automationState.update({
        where: { id: "default" },
        data: {
          lastScanStatus: "error",
          lastScanSummary:
            "扫描超时未完成（>25min），已自动重置。请重新点击扫描或运行 npm run auto:scan-once",
        },
      });
    }
  }

  const nextScanAt = getNextScanAt(state.scanSchedule);
  const logs = await prisma.automationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return ok({
    state,
    nextScanAt: nextScanAt?.toISOString() ?? null,
    scheduleLabel: formatScheduleLabel(state.scanSchedule),
    logs,
  });
}

/** PATCH /api/automation  更新开关、时间表等 */
export async function PATCH(req: Request) {
  const body = await parseBody<{
    enabled?: boolean;
    scanMode?: string;
    scanSchedule?: string | string[];
    scanIntervalMs?: number;
    lastScanStatus?: string;
    lastScanSummary?: string;
    lastScanSlot?: string;
  }>(req);

  const scheduleValue =
    body.scanSchedule !== undefined
      ? JSON.stringify(parseSchedule(body.scanSchedule))
      : undefined;

  const state = await prisma.automationState.upsert({
    where: { id: "default" },
    update: {
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.scanMode !== undefined ? { scanMode: body.scanMode } : {}),
      ...(scheduleValue !== undefined ? { scanSchedule: scheduleValue } : {}),
      ...(body.scanIntervalMs !== undefined
        ? { scanIntervalMs: body.scanIntervalMs }
        : {}),
      ...(body.lastScanStatus !== undefined
        ? { lastScanStatus: body.lastScanStatus }
        : {}),
      ...(body.lastScanSummary !== undefined
        ? { lastScanSummary: body.lastScanSummary }
        : {}),
      ...(body.lastScanSlot !== undefined
        ? { lastScanSlot: body.lastScanSlot }
        : {}),
      ...(body.lastScanStatus === "success" || body.lastScanStatus === "running"
        ? { lastScanAt: new Date() }
        : {}),
    },
    create: {
      ...DEFAULT_STATE,
      enabled: body.enabled ?? true,
      scanMode: body.scanMode ?? "schedule",
      scanSchedule: scheduleValue ?? JSON.stringify(DEFAULT_SCHEDULE),
      scanIntervalMs: body.scanIntervalMs ?? 300000,
      lastScanStatus: body.lastScanStatus ?? "idle",
      lastScanSummary: body.lastScanSummary ?? null,
      lastScanSlot: body.lastScanSlot ?? null,
    },
  });

  return ok(state);
}

/** POST /api/automation  触发扫描或流水线 */
export async function POST(req: Request) {
  const user = await requireApiUser({ adminOnly: true });
  if (!user.ok) return fail(user.error, user.status);

  const body = await parseBody<{
    action?: string;
    customerIds?: string[];
  }>(req);

  if (body.action === "scan-once") {
    const { logAutomation } = await import("@/lib/pipeline");
    let state = await prisma.automationState.findUnique({
      where: { id: "default" },
    });

    // 卡死的 running 状态允许重新触发
    if (state?.lastScanStatus === "running" && state.lastScanAt) {
      const mins =
        (Date.now() - new Date(state.lastScanAt).getTime()) / 60000;
      if (mins <= 25) {
        return fail("扫描正在进行中，请稍候（或查看弹出的 Chrome 窗口）");
      }
      state = await prisma.automationState.update({
        where: { id: "default" },
        data: {
          lastScanStatus: "error",
          lastScanSummary: "上次扫描超时，正在重新启动…",
        },
      });
    }

    await prisma.automationState.upsert({
      where: { id: "default" },
      update: {
        lastScanStatus: "running",
        lastScanSummary: "看板手动触发，正在启动浏览器…",
        lastScanAt: new Date(),
      },
      create: {
        ...DEFAULT_STATE,
        lastScanStatus: "running",
        lastScanSummary: "看板手动触发，正在启动浏览器…",
        lastScanAt: new Date(),
      },
    });
    await logAutomation("scan", "running", "看板手动触发 WhatsApp 扫描");

    const { spawn } = await import("node:child_process");
    const { openSync } = await import("node:fs");
    const { join } = await import("node:path");
    const script = join(process.cwd(), "scripts", "wa-auto-scan.mjs");
    const logPath = join(process.cwd(), ".wa-scan.log");

    try {
      const logFd = openSync(logPath, "a");
      const child = spawn(
        process.execPath,
        [script, "--keep-open"],
        {
          cwd: process.cwd(),
          detached: true,
          stdio: ["ignore", logFd, logFd],
          env: {
            ...process.env,
            HUB_URL: process.env.HUB_URL ?? "http://localhost:3000",
          },
        }
      );
      child.unref();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await logAutomation("scan", "error", `启动扫描失败：${msg}`);
      await prisma.automationState.update({
        where: { id: "default" },
        data: { lastScanStatus: "error", lastScanSummary: msg },
      });
      return fail(msg);
    }

    return ok({
      message:
        "扫描已启动：请查看弹出的 Chrome 窗口（非 Cursor 浏览器）。日志见 .wa-scan.log",
      logFile: ".wa-scan.log",
    });
  }

  if (body.action === "pipeline-all") {
    const { runPipelineBatch, logAutomation } = await import("@/lib/pipeline");
    const results = await runPipelineBatch();
    const drafts = results.filter((r) => r.draftCreated).length;
    const summary = `流水线完成：${results.length} 客户，新建草稿 ${drafts} 条`;
    await logAutomation("pipeline", "success", summary);
    return ok({ results, summary });
  }

  if (body.action === "enrich-all") {
    const { runPipelineBatch, logAutomation } = await import("@/lib/pipeline");
    const ids = body.customerIds?.length ? body.customerIds : undefined;
    const results = await runPipelineBatch(ids);
    const enriched = results.filter((r) => r.enrichmentCreated).length;

    let researchSummary = "";
    try {
      const researchRes = await fetch(
        new URL("/api/research/linkedin", req.url).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            ids?.length ? { customerIds: ids } : { all: true }
          ),
        }
      );
      const researchJson = await researchRes.json();
      researchSummary = researchJson.data?.summary ?? "";
    } catch (e) {
      researchSummary =
        e instanceof Error ? e.message : "LinkedIn 检索未执行";
    }

    const summary = `背景调查：Pipeline ${results.length} 人（新建背景 ${enriched}）；${researchSummary}`;
    await logAutomation("research", "success", summary);
    return ok({ results, summary });
  }

  return fail("未知 action，可用: scan-once, pipeline-all, enrich-all");
}
