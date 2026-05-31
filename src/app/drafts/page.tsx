"use client";

import { useEffect, useState, useCallback } from "react";
import type { ReplyDraft } from "@/lib/types";
import { DRAFT_STATUSES, draftStatusLabel } from "@/lib/constants";
import { DraftCard } from "@/components/DraftCard";
export default function DraftsPage() {
  const [drafts, setDrafts] = useState<ReplyDraft[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/drafts?${params.toString()}`);
    const json = await res.json();
    setDrafts(json.data ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">回复草稿</h1>
        <p className="mt-1 text-sm text-slate-500">
          确认后我会在 WhatsApp Web 上发送给客户
        </p>
      </div>

      <div className="flex gap-2">
        {[{ value: "", label: "全部" }, ...DRAFT_STATUSES].map((s) => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              status === s.value
                ? "bg-brand text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400">加载中…</div>
      ) : drafts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
          没有{draftStatusLabel(status)}的草稿
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} onPatch={patch} />
          ))}
        </div>
      )}
    </div>
  );
}
