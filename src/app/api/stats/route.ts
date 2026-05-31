import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

// GET /api/stats  概览统计
export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    total,
    todayNew,
    pendingDrafts,
    unverifiedEnrichments,
    byStatus,
    byCountry,
    byInquiry,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { firstContact: { gte: startOfToday } } }),
    prisma.replyDraft.count({ where: { status: "pending" } }),
    prisma.enrichment.count({ where: { verified: false } }),
    prisma.customer.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.groupBy({ by: ["country"], _count: { _all: true } }),
    prisma.inquiry.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  return ok({
    total,
    todayNew,
    pendingDrafts,
    unverifiedEnrichments,
    byStatus: byStatus.map((s) => ({ key: s.status, count: s._count._all })),
    byCountry: byCountry
      .map((c) => ({ key: c.country ?? "未知", count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    byInquiry: byInquiry.map((i) => ({ key: i.type, count: i._count._all })),
  });
}
