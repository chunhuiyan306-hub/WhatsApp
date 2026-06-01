"use client";

import { useEffect, useState } from "react";
import type { Customer, Enrichment } from "@/lib/types";
import { formatDate } from "@/lib/types";
import {
  DEAL_STAGES,
  LEAD_SOURCES,
  ACTIVITY_TYPES,
  activityTypeLabel,
  dealStageLabel,
} from "@/lib/constants";
import { DealStageBadge } from "@/components/Badges";

type PatchFn = (data: Record<string, unknown>) => Promise<void>;

export function CustomerProfileCard({
  customer,
  onPatch,
  onReload,
}: {
  customer: Customer;
  onPatch: PatchFn;
  onReload: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(buildForm(customer));

  useEffect(() => setForm(buildForm(customer)), [customer]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await onPatch({
      ...form,
      nextFollowUpAt: form.nextFollowUpAt
        ? new Date(form.nextFollowUpAt).toISOString()
        : null,
    });
    setSaving(false);
  }

  function fillFromEnrichment(e: Enrichment) {
    setForm((f) => ({
      ...f,
      companyName: f.companyName || e.company || "",
      jobTitle: f.jobTitle || e.role || "",
      website: f.website || e.website || "",
    }));
  }

  const verified = customer.enrichments?.find((e) => e.verified) ?? customer.enrichments?.[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700">客户档案</h2>
        <div className="flex items-center gap-2">
          <DealStageBadge stage={customer.dealStage ?? "inquiry"} />
          {verified && !form.companyName && (
            <button
              type="button"
              onClick={() => fillFromEnrichment(verified)}
              className="text-xs text-brand-dark hover:underline"
            >
              从背景调查填入
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="公司全称">
          <input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            className={inputCls}
            placeholder="如 ABC Design LLC"
          />
        </Field>
        <Field label="职位">
          <input
            value={form.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="邮箱">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="网站">
          <input
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="地址" className="sm:col-span-2">
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="意向产品/规格">
          <input
            value={form.productInterest}
            onChange={(e) => set("productInterest", e.target.value)}
            className={inputCls}
            placeholder="如 大理石纹岩板 1200×2400"
          />
        </Field>
        <Field label="数量">
          <input
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            className={inputCls}
            placeholder="如 500㎡ / 2柜"
          />
        </Field>
        <Field label="预算">
          <input
            value={form.estimatedBudget}
            onChange={(e) => set("estimatedBudget", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="期望交期">
          <input
            value={form.expectedDelivery}
            onChange={(e) => set("expectedDelivery", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="商机阶段">
          <select
            value={form.dealStage}
            onChange={(e) => set("dealStage", e.target.value)}
            className={inputCls}
          >
            {DEAL_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="客户来源">
          <select
            value={form.leadSource}
            onChange={(e) => set("leadSource", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="报价金额">
          <input
            value={form.quoteAmount}
            onChange={(e) => set("quoteAmount", e.target.value)}
            className={inputCls}
            placeholder="USD / CNY"
          />
        </Field>
        <Field label="成交金额">
          <input
            value={form.orderAmount}
            onChange={(e) => set("orderAmount", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="负责人">
          <input
            value={form.assignedTo}
            onChange={(e) => set("assignedTo", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="下次跟进">
          <input
            type="datetime-local"
            value={form.nextFollowUpAt}
            onChange={(e) => set("nextFollowUpAt", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存档案"}
        </button>
      </div>

      <ActivitySection customer={customer} onReload={onReload} />
    </div>
  );
}

function ActivitySection({
  customer,
  onReload,
}: {
  customer: Customer;
  onReload: () => void;
}) {
  const [type, setType] = useState("follow_up");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function add() {
    if (!title.trim()) return;
    await fetch(`/api/customers/${customer.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, content }),
    });
    setTitle("");
    setContent("");
    onReload();
  }

  const activities = customer.activities ?? [];

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold text-slate-700">跟进记录</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题，如：已发报价单 v2"
          className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        />
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="详情（可选）"
          className="min-w-[140px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          添加
        </button>
      </div>
      {activities.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">暂无跟进记录</p>
      ) : (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {activities.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">
                  [{activityTypeLabel(a.type)}] {a.title}
                </span>
                <span className="shrink-0 text-slate-400">
                  {formatDate(a.createdAt)}
                </span>
              </div>
              {a.content && (
                <p className="mt-1 text-slate-600">{a.content}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-xs ${className}`}>
      <span className="text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-brand";

function buildForm(c: Customer) {
  return {
    companyName: c.companyName ?? "",
    jobTitle: c.jobTitle ?? "",
    email: c.email ?? "",
    website: c.website ?? "",
    address: c.address ?? "",
    productInterest: c.productInterest ?? "",
    quantity: c.quantity ?? "",
    estimatedBudget: c.estimatedBudget ?? "",
    expectedDelivery: c.expectedDelivery ?? "",
    dealStage: c.dealStage ?? "inquiry",
    leadSource: c.leadSource ?? "",
    quoteAmount: c.quoteAmount ?? "",
    orderAmount: c.orderAmount ?? "",
    assignedTo: c.assignedTo ?? "",
    nextFollowUpAt: c.nextFollowUpAt
      ? toLocalDatetimeInput(c.nextFollowUpAt)
      : "",
  };
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
