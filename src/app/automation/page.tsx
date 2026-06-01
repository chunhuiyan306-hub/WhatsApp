"use client";

import { useCallback, useEffect, useState } from "react";

interface AutomationState {
  enabled: boolean;
  scanMode: string;
  scanSchedule: string;
  scanIntervalMs: number;
  lastScanAt: string | null;
  lastScanSlot: string | null;
  lastScanStatus: string | null;
  lastScanSummary: string | null;
}

interface LogRow {
  id: string;
  action: string;
  status: string;
  summary: string | null;
  createdAt: string;
}

export default function AutomationPage() {
  const [state, setState] = useState<AutomationState | null>(null);
  const [nextScanAt, setNextScanAt] = useState<string | null>(null);
  const [scheduleLabel, setScheduleLabel] = useState("10:00、15:00");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [morning, setMorning] = useState("10:00");
  const [afternoon, setAfternoon] = useState("15:00");

  const load = useCallback(async () => {
    const res = await fetch("/api/automation");
    const json = await res.json();
    if (json.ok) {
      const s = json.data.state as AutomationState;
      setState(s);
      setNextScanAt(json.data.nextScanAt ?? null);
      setScheduleLabel(json.data.scheduleLabel ?? "10:00、15:00");
      setLogs(json.data.logs ?? []);
      try {
        const times = JSON.parse(s.scanSchedule || '["10:00","15:00"]') as string[];
        if (times[0]) setMorning(times[0]);
        if (times[1]) setAfternoon(times[1]);
      } catch {
        /* keep defaults */
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function patch(data: Record<string, unknown>) {
    await fetch("/api/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function saveSchedule() {
    await patch({
      scanMode: "schedule",
      scanSchedule: [morning, afternoon],
    });
  }

  async function scanWhatsAppNow() {
    setRunning(true);
    const res = await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "scan-once" }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert(json.error || "启动扫描失败");
      setRunning(false);
      load();
      return;
    }

    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch("/api/automation");
      const statusJson = await statusRes.json();
      if (statusJson.ok) {
        setState(statusJson.data.state);
        setLogs(statusJson.data.logs ?? []);
        const status = statusJson.data.state?.lastScanStatus;
        if (status && status !== "running") break;
      }
    }
    setRunning(false);
    load();
  }

  async function runPipelineAll() {
    setRunning(true);
    await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pipeline-all" }),
    });
    setRunning(false);
    load();
  }

  if (loading) {
    return <div className="p-10 text-center text-slate-400">加载中…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">自动化工作流</h1>
        <p className="mt-1 text-sm text-slate-500">
          WhatsApp 扫描 → 翻译 → 分类 → 标签 → LinkedIn 背景 → 草稿（全自动，无需每次提醒 Agent）
        </p>
      </div>

      <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm text-slate-700">
        <p className="font-semibold text-brand-deep">推荐：一条命令搞定</p>
        <p className="mt-1">
          终端运行{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
            npm run hub
          </code>
          — 同时启动看板 + 定时 Worker + <strong>启动时自动补扫</strong>（距上次 &gt;3 小时）。
          每天 10:00、15:00 还会再扫一次。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">WhatsApp 扫描计划</h2>
          <p className="mt-2 text-sm text-slate-500">
            保持{" "}
            <code className="rounded bg-slate-100 px-1">npm run hub</code>{" "}
            窗口常开（可最小化），到点自动扫<strong>最近 30 个会话</strong>（各 10 条消息）。
          </p>

          <div className="mt-4 flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state?.enabled ?? true}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              启用定时扫描
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label className="block">
              <span className="text-slate-500">早上</span>
              <input
                type="time"
                value={morning}
                onChange={(e) => setMorning(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
            <label className="block">
              <span className="text-slate-500">下午</span>
              <input
                type="time"
                value={afternoon}
                onChange={(e) => setAfternoon(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
          </div>
          <button
            onClick={saveSchedule}
            className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            保存扫描时间
          </button>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">当前计划</dt>
              <dd className="font-medium text-slate-800">{scheduleLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">下次扫描</dt>
              <dd className="text-slate-800">
                {nextScanAt
                  ? new Date(nextScanAt).toLocaleString("zh-CN")
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">上次扫描</dt>
              <dd className="text-slate-800">
                {state?.lastScanAt
                  ? new Date(state.lastScanAt).toLocaleString("zh-CN")
                  : "尚未运行"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">状态</dt>
              <dd className="font-medium text-slate-800">
                {state?.lastScanStatus ?? "idle"}
              </dd>
            </div>
            {state?.lastScanSummary && (
              <div className="text-slate-600">{state.lastScanSummary}</div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">立即执行</h2>
          <p className="mt-2 text-sm text-slate-500">
            马上扫描 WhatsApp <strong>最近 30 个会话</strong>（各 10 条）→ 自动流水线 → LinkedIn 背景。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={scanWhatsAppNow}
              disabled={running}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {running ? "扫描中…" : "立即扫描 WhatsApp"}
            </button>
            <button
              onClick={runPipelineAll}
              disabled={running}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              仅重跑流水线
            </button>
          </div>
          <p className="mt-3 text-xs text-amber-700">
            扫描会<strong>弹出独立 Chrome 窗口</strong>（不是 Cursor 侧边栏）。首次需扫码登录。
            日志文件：<code className="rounded bg-white px-1">.wa-scan.log</code>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            状态卡在 running 超过 25 分钟会自动重置，可再次点击扫描。
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">运行日志</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">暂无日志</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((l) => (
              <li key={l.id} className="flex gap-3 py-2 text-sm">
                <span className="shrink-0 text-slate-400">
                  {new Date(l.createdAt).toLocaleString("zh-CN")}
                </span>
                <span
                  className={
                    l.status === "error" ? "text-red-600" : "text-slate-600"
                  }
                >
                  [{l.action}] {l.summary ?? l.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
