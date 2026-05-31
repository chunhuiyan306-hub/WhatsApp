import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

// POST /api/enrichments  写入/更新背景调查结果
export async function POST(req: Request) {
  const body = await parseBody<{
    id?: string;
    customerId: string;
    linkedinUrl?: string;
    company?: string;
    role?: string;
    website?: string;
    source?: string;
    confidence?: string;
    verified?: boolean;
    note?: string;
  }>(req);

  if (!body.customerId) return fail("customerId 必填");

  const data = {
    linkedinUrl: body.linkedinUrl ?? null,
    company: body.company ?? null,
    role: body.role ?? null,
    website: body.website ?? null,
    source: body.source ?? null,
    confidence: body.confidence ?? "low",
    verified: body.verified ?? false,
    note: body.note ?? null,
  };

  const enrichment = body.id
    ? await prisma.enrichment.update({ where: { id: body.id }, data })
    : await prisma.enrichment.create({
        data: { customerId: body.customerId, ...data },
      });

  return ok(enrichment, body.id ? 200 : 201);
}

// PATCH /api/enrichments  标记已人工确认
export async function PATCH(req: Request) {
  const body = await parseBody<{ id: string; verified?: boolean }>(req);
  if (!body.id) return fail("id 必填");
  const enrichment = await prisma.enrichment.update({
    where: { id: body.id },
    data: { verified: body.verified ?? true },
  });
  return ok(enrichment);
}
