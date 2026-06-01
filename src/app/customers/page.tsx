"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { StatusBadge, InquiryBadge, TagBadge, DealStageBadge } from "@/components/Badges";
import { AddCustomerModal } from "@/components/AddCustomerModal";
import { CUSTOMER_STATUSES, INQUIRY_TYPES, DEAL_STAGES } from "@/lib/constants";

function customerLabel(c: Customer) {
  return c.name || c.waChatId || c.phone || "未命名客户";
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [country, setCountry] = useState("");
  const [dealStage, setDealStage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (inquiry) params.set("inquiry", inquiry);
    if (country) params.set("country", country);
    if (dealStage) params.set("dealStage", dealStage);
    const res = await fetch(`/api/customers?${params.toString()}`);
    const json = await res.json();
    setCustomers(json.data ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [q, status, inquiry, country, dealStage]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const countries = Array.from(
    new Set(customers.map((c) => c.country).filter(Boolean) as string[])
  );

  const allSelected =
    customers.length > 0 && selected.size === customers.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(customers.map((c) => c.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteCustomers(ids: string[], labels: string[]) {
    const preview =
      labels.length <= 3
        ? labels.join("、")
        : `${labels.slice(0, 3).join("、")} 等 ${labels.length} 位`;
    const ok = window.confirm(
      `确定删除 ${preview}？\n\n将永久删除客户及其消息、草稿、背景调查等全部数据，不可恢复。`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      if (ids.length === 1) {
        await fetch(`/api/customers/${ids[0]}`, { method: "DELETE" });
      } else {
        await fetch("/api/customers", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      }
      await load();
    } finally {
      setDeleting(false);
    }
  }

  function deleteOne(c: Customer) {
    deleteCustomers([c.id], [customerLabel(c)]);
  }

  function deleteSelected() {
    const ids = [...selected];
    const labels = customers
      .filter((c) => selected.has(c.id))
      .map(customerLabel);
    deleteCustomers(ids, labels);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户</h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {customers.length} 位 · 只保留有意义、高转化的客户，低价值可删除
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              disabled={deleting}
              onClick={deleteSelected}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {deleting ? "删除中…" : `删除选中 (${selected.size})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            + 添加客户
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索姓名 / 电话 / 画像…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">全部状态</option>
          {CUSTOMER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={inquiry}
          onChange={(e) => setInquiry(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">全部需求</option>
          {INQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">全部国家</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={dealStage}
          onChange={(e) => setDealStage(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        >
          <option value="">全部阶段</option>
          {DEAL_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-400">加载中…</div>
        ) : customers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p>暂无客户。</p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-3 text-brand-dark hover:underline"
            >
              手动添加第一位客户
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全选"
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">国家</th>
                <th className="px-4 py-3">需求</th>
                <th className="px-4 py-3">标签</th>
                <th className="px-4 py-3">阶段</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">下次跟进</th>
                <th className="px-4 py-3">最近联系</th>
                <th className="w-14 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                    selected.has(c.id) ? "bg-brand/5" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`选择 ${customerLabel(c)}`}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="block font-medium text-slate-900 hover:text-brand-dark"
                    >
                      {customerLabel(c)}
                    </Link>
                    <span className="text-xs text-slate-400">{c.phone}</span>
                    {c.companyName && (
                      <p className="text-xs text-slate-500">{c.companyName}</p>
                    )}
                    {c.summary && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {c.summary}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.country || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(c.inquiries.map((i) => i.type))).map(
                        (t) => (
                          <InquiryBadge key={t} type={t} />
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <TagBadge
                          key={t.tagId}
                          name={t.tag.name}
                          color={t.tag.color}
                          synced={t.syncedToWa}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DealStageBadge stage={c.dealStage ?? "inquiry"} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.nextFollowUpAt ? (
                      <span
                        className={
                          new Date(c.nextFollowUpAt) < new Date()
                            ? "font-medium text-amber-600"
                            : ""
                        }
                      >
                        {formatDate(c.nextFollowUpAt)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(c.lastContact)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => deleteOne(c)}
                      title="删除客户"
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddCustomerModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(id) => {
          load();
          router.push(`/customers/${id}`);
        }}
      />
    </div>
  );
}
