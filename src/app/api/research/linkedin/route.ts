import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { logAutomation } from "@/lib/pipeline";
import { verifyScannerRequest, isIngestSecretConfigured } from "@/lib/scanner-auth";
import { requireApiUser } from "@/lib/user-role";
import {
  buildSearchQuery,
  searchLinkedInUrls,
} from "@/lib/research/linkedin-search";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** POST /api/research/linkedin  扫描后批量检索 LinkedIn / 公开资料 */
export async function POST(req: Request) {
  const scannerOk =
    !isIngestSecretConfigured() || verifyScannerRequest(req);
  if (!scannerOk) {
    const user = await requireApiUser({ adminOnly: true });
    if (!user.ok) return fail(user.error, user.status);
  }

  const body = await parseBody<{ customerIds?: string[]; all?: boolean }>(req);

  const customers = await prisma.customer.findMany({
    where: body.customerIds?.length
      ? { id: { in: body.customerIds } }
      : body.all
        ? {}
        : undefined,
    include: {
      enrichments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastContact: "desc" },
  });

  if (!customers.length) {
    return fail("需要 customerIds 或 all:true");
  }

  const results: Array<{
    customerId: string;
    name: string | null;
    linkedinUrl?: string;
    skipped?: string;
  }> = [];

  for (const c of customers) {
    const latest = c.enrichments[0];
    if (latest?.verified && latest.linkedinUrl) {
      results.push({
        customerId: c.id,
        name: c.name,
        linkedinUrl: latest.linkedinUrl,
        skipped: "已有已核实 LinkedIn",
      });
      continue;
    }

    const query = buildSearchQuery({
      name: c.name,
      country: c.country,
      companyName: c.companyName,
      phone: c.phone,
    });

    if (!query) {
      results.push({
        customerId: c.id,
        name: c.name,
        skipped: "无有效检索词（缺昵称/公司名）",
      });
      continue;
    }

    let linkedinUrl: string | undefined;
    try {
      const urls = await searchLinkedInUrls(query);
      linkedinUrl = urls[0];
    } catch {
      linkedinUrl = undefined;
    }

    await prisma.enrichment.create({
      data: {
        customerId: c.id,
        linkedinUrl: linkedinUrl ?? latest?.linkedinUrl ?? null,
        company: latest?.company ?? c.companyName ?? "未公开",
        role: latest?.role ?? null,
        website: latest?.website ?? null,
        source: linkedinUrl
          ? "post-scan · DuckDuckGo LinkedIn 检索"
          : "post-scan · 公开检索（未命中 LinkedIn）",
        confidence: linkedinUrl ? "medium" : "low",
        verified: false,
        note: linkedinUrl
          ? `WhatsApp 扫描后自动检索「${query}」；候选 ${linkedinUrl}，需人工核实是否同一人。`
          : `WhatsApp 扫描后检索「${query}」未找到 LinkedIn；可补充公司名或让 Agent 深度调查。`,
      },
    });

    results.push({ customerId: c.id, name: c.name, linkedinUrl });
    await sleep(1200);
  }

  const hits = results.filter((r) => r.linkedinUrl).length;
  const summary = `LinkedIn 背景检索：${customers.length} 人，命中 ${hits}，跳过 ${results.filter((r) => r.skipped).length}`;
  await logAutomation("research", "success", summary);

  return ok({ results, summary, count: results.length });
}
