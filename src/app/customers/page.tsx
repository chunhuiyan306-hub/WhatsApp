"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { StatusBadge, InquiryBadge, TagBadge } from "@/components/Badges";
import { CUSTOMER_STATUSES, INQUIRY_TYPES } from "@/lib/constants";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [country, setCountry] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (inquiry) params.set("inquiry", inquiry);
    if (country) params.set("country", country);
    const res = await fetch(`/api/customers?${params.toString()}`);
    const json = await res.json();
    setCustomers(json.data ?? []);
    setLoading(false);
  }, [q, status, inquiry, country]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const countries = Array.from(
    new Set(customers.map((c) => c.country).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户</h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {customers.length} 位客户
          </p>
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
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-400">加载中…</div>
        ) : customers.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            暂无客户。让我扫描一遍 WhatsApp Web 就会出现在这里。
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">客户</th>
                <th className="px-4 py-3">国家</th>
                <th className="px-4 py-3">需求</th>
                <th className="px-4 py-3">标签</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">最近联系</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="block font-medium text-slate-900 hover:text-brand-dark"
                    >
                      {c.name || c.waChatId || c.phone || "未命名客户"}
                    </Link>
                    <span className="text-xs text-slate-400">{c.phone}</span>
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
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(c.lastContact)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
