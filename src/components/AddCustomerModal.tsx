"use client";

import { useState } from "react";
import { LEAD_SOURCES } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (customerId: string) => void;
}

export function AddCustomerModal({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    companyName: "",
    leadSource: "other",
    summary: "",
    notes: "",
  });

  if (!open) return null;

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() && !form.phone.trim()) {
      setError("请至少填写姓名或电话");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          leadSource: form.leadSource,
          summary: form.summary.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "创建失败");
        return;
      }
      onCreated(json.data.id);
      setForm({
        name: "",
        phone: "",
        companyName: "",
        leadSource: "other",
        summary: "",
        notes: "",
      });
      onClose();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">手动添加客户</h2>
        <p className="mt-1 text-sm text-slate-500">
          用于其它渠道漏扫、展会名片、转介绍等。至少填姓名或电话。
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">姓名</span>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="如 Lora Bergiy"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-xs font-medium text-slate-600">电话</span>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+971 50 946 4300"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">公司</span>
            <input
              value={form.companyName}
              onChange={(e) => update("companyName", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">来源渠道</span>
            <select
              value={form.leadSource}
              onChange={(e) => update("leadSource", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">一句话画像</span>
            <input
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              placeholder="高意向，咨询玻璃门型材…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">备注</span>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? "保存中…" : "添加客户"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
