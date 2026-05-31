import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  statusLabel,
  statusColor,
  inquiryLabel,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

async function getStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, todayNew, pendingDrafts, unverified, byStatus, byCountry, byInquiry] =
    await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { firstContact: { gte: startOfToday } } }),
      prisma.replyDraft.count({ where: { status: "pending" } }),
      prisma.enrichment.count({ where: { verified: false } }),
      prisma.customer.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.customer.groupBy({ by: ["country"], _count: { _all: true } }),
      prisma.inquiry.groupBy({ by: ["type"], _count: { _all: true } }),
    ]);

  return {
    total,
    todayNew,
    pendingDrafts,
    unverified,
    byStatus: byStatus.map((s) => ({ key: s.status, count: s._count._all })),
    byCountry: byCountry
      .map((c) => ({ key: c.country ?? "未知", count: c._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byInquiry: byInquiry.map((i) => ({ key: i.type, count: i._count._all })),
  };
}

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className="mt-2 text-3xl font-bold"
        style={{ color: accent ?? "#0f172a" }}
      >
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function BarList({
  title,
  items,
  colorOf,
  labelOf,
}: {
  title: string;
  items: { key: string; count: number }[];
  colorOf?: (k: string) => string;
  labelOf?: (k: string) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">暂无数据</p>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600">
                  {labelOf ? labelOf(i.key) : i.key}
                </span>
                <span className="font-medium text-slate-800">{i.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(i.count / max) * 100}%`,
                    backgroundColor: colorOf ? colorOf(i.key) : "#25D366",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function OverviewPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">概览</h1>
        <p className="mt-1 text-sm text-slate-500">
          客户咨询、需求分布与待办一览
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="累计客户" value={stats.total} href="/customers" accent="#075E54" />
        <StatCard label="今日新客" value={stats.todayNew} href="/customers" accent="#25D366" />
        <StatCard
          label="待确认回复"
          value={stats.pendingDrafts}
          href="/drafts"
          accent="#f59e0b"
        />
        <StatCard
          label="待核实背景资料"
          value={stats.unverified}
          accent="#3b82f6"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BarList
          title="客户状态分布"
          items={stats.byStatus}
          labelOf={statusLabel}
          colorOf={statusColor}
        />
        <BarList
          title="需求分布"
          items={stats.byInquiry}
          labelOf={inquiryLabel}
        />
        <BarList title="国家/地区分布 (Top 10)" items={stats.byCountry} />
      </div>
    </div>
  );
}
