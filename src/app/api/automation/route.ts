import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import {
  DEFAULT_SCHEDULE,
  getNextScanAt,
  formatScheduleLabel,
  parseSchedule,
} from "@/lib/schedule";

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

/** POST /api/automation  触发流水线（不扫 WA，仅处理已有客户） */
export async function POST(req: Request) {
  const body = await parseBody<{ action?: string }>(req);
  if (body.action === "pipeline-all") {
    const { runPipelineBatch, logAutomation } = await import("@/lib/pipeline");
    const results = await runPipelineBatch();
    const drafts = results.filter((r) => r.draftCreated).length;
    const summary = `流水线完成：${results.length} 客户，新建草稿 ${drafts} 条`;
    await logAutomation("pipeline", "success", summary);
    return ok({ results, summary });
  }
  return fail("未知 action，可用: pipeline-all");
}
