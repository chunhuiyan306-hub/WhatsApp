"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReplyDraft } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { draftStatusLabel, isRtlLang, looksRtl } from "@/lib/constants";
import { parseAttachments } from "@/lib/storage";

type Props = {
  draft: ReplyDraft;
  onPatch: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  showCustomerLink?: boolean;
};

export function DraftCard({
  draft: d,
  onPatch,
  onDelete,
  showCustomerLink = true,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(d.draftTarget ?? "");
  const [zh, setZh] = useState(d.draftZh);
  const [saving, setSaving] = useState(false);

  const rtl = isRtlLang(d.targetLang) || looksRtl(editing ? target : d.draftTarget);
  const canEdit = d.status === "pending" || d.status === "approved";
  const attachments = parseAttachments(d.attachments);

  async function saveEdit() {
    setSaving(true);
    await onPatch(d.id, { draftTarget: target, draftZh: zh });
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setTarget(d.draftTarget ?? "");
    setZh(d.draftZh);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {showCustomerLink && (
        <div className="mb-2 flex items-center justify-between">
          <Link
            href={`/customers/${d.customer?.id}`}
            className="font-medium text-slate-900 hover:text-brand-dark"
          >
            {d.customer?.name || d.customer?.phone || "客户"}
            {d.customer?.country && (
              <span className="ml-2 text-xs text-slate-400">
                {d.customer.country}
              </span>
            )}
          </Link>
          <span className="text-xs font-medium text-slate-500">
            {draftStatusLabel(d.status)}
          </span>
        </div>
      )}

      {!showCustomerLink && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            {draftStatusLabel(d.status)}
            {d.targetLang && ` · ${d.targetLang}`}
          </span>
          <span className="text-xs text-slate-400">{formatDate(d.createdAt)}</span>
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-500">
            发给客人的原文
          </label>
          <textarea
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            dir={rtl ? "rtl" : "ltr"}
            rows={4}
            className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand ${rtl ? "rtl text-right" : ""}`}
          />
          <label className="block text-xs font-medium text-slate-500">
            中文对照（仅看板可见）
          </label>
          <textarea
            value={zh}
            onChange={(e) => setZh(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-emerald-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存修改"}
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <>
          {d.draftTarget && (
            <p
              className={`text-sm text-slate-800 ${rtl ? "rtl" : ""}`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {d.draftTarget}
            </p>
          )}
          <p className="mt-1 border-t border-slate-100 pt-1 text-sm text-emerald-700">
            {d.draftZh}
          </p>
          {attachments.length > 0 && (
            <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-medium">随消息发送的资料：</p>
              <ul className="mt-1 space-y-1">
                {attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand underline"
                    >
                      📎 {a.name}
                    </a>
                    <span className="ml-1 text-slate-400">({a.category})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-slate-500">
                确认发送时，我会把上述 PDF 和文字一起在 WhatsApp 发出。
              </p>
            </div>
          )}
        </>
      )}

      {!editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              编辑
            </button>
          )}
          {d.status === "pending" && (
            <button
              onClick={() => onPatch(d.id, { status: "approved" })}
              className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark"
            >
              确认（待我发送）
            </button>
          )}
          {(d.status === "pending" || d.status === "approved") && (
            <button
              onClick={() => onPatch(d.id, { status: "sent" })}
              className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
            >
              标记已发送
            </button>
          )}
          {d.status !== "rejected" && d.status !== "sent" && (
            <button
              onClick={() => onPatch(d.id, { status: "rejected" })}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              否决
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(d.id)}
              className="rounded-md px-3 py-1 text-xs text-slate-300 hover:text-red-500"
            >
              删除
            </button>
          )}
          {showCustomerLink && (
            <span className="ml-auto text-xs text-slate-400">
              {formatDate(d.createdAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
