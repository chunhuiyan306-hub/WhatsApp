import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { analyzePhone } from "@/lib/phone";
import type { Prisma } from "@prisma/client";

// GET /api/customers?q=&status=&country=&tag=&inquiry=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();
  const country = searchParams.get("country")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const inquiry = searchParams.get("inquiry")?.trim();

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { rawPhone: { contains: q } },
      { waChatId: { contains: q } },
      { summary: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (country) where.country = country;
  if (tag) where.tags = { some: { tag: { name: tag } } };
  if (inquiry) where.inquiries = { some: { type: inquiry } };

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { lastContact: "desc" },
    include: {
      tags: { include: { tag: true } },
      inquiries: true,
      _count: { select: { messages: true, drafts: true } },
    },
  });

  return ok(customers);
}

// POST /api/customers  创建或按 phone/waChatId upsert
export async function POST(req: Request) {
  const body = await parseBody<{
    name?: string;
    phone?: string;
    waChatId?: string;
    language?: string;
    status?: string;
    summary?: string;
    notes?: string;
  }>(req);

  if (!body.phone && !body.waChatId && !body.name) {
    return fail("至少需要 name / phone / waChatId 之一");
  }

  const info = analyzePhone(body.phone);

  const data = {
    name: body.name ?? null,
    rawPhone: body.phone ?? null,
    phone: info.e164 ?? body.phone ?? null,
    country: info.country,
    countryCode: info.countryCode,
    callingCode: info.callingCode,
    language: body.language ?? null,
    waChatId: body.waChatId ?? null,
    status: body.status ?? "new",
    summary: body.summary ?? null,
    notes: body.notes ?? null,
    lastContact: new Date(),
  };

  // 优先按规范化号码 upsert，其次 waChatId
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        info.e164 ? { phone: info.e164 } : undefined,
        body.waChatId ? { waChatId: body.waChatId } : undefined,
      ].filter(Boolean) as Prisma.CustomerWhereInput[],
    },
  });

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          summary: data.summary ?? existing.summary,
          notes: data.notes ?? existing.notes,
          language: data.language ?? existing.language,
          status: body.status ?? existing.status,
          country: data.country ?? existing.country,
          countryCode: data.countryCode ?? existing.countryCode,
          callingCode: data.callingCode ?? existing.callingCode,
          lastContact: new Date(),
        },
      })
    : await prisma.customer.create({ data });

  return ok(customer, existing ? 200 : 201);
}
