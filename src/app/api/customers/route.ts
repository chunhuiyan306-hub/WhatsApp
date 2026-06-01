import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { analyzePhone } from "@/lib/phone";
import { requireApiUser } from "@/lib/user-role";
import type { Prisma } from "@prisma/client";

// GET /api/customers?q=&status=&country=&tag=&inquiry=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();
  const country = searchParams.get("country")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const inquiry = searchParams.get("inquiry")?.trim();
  const dealStage = searchParams.get("dealStage")?.trim();

  const where: Prisma.CustomerWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { rawPhone: { contains: q } },
      { waChatId: { contains: q } },
      { summary: { contains: q } },
      { companyName: { contains: q } },
      { productInterest: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (country) where.country = country;
  if (dealStage) where.dealStage = dealStage;
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
    companyName?: string;
    leadSource?: string;
    dealStage?: string;
    email?: string;
  }>(req);

  if (!body.phone && !body.waChatId && !body.name) {
    return fail("至少需要 name / phone / waChatId 之一");
  }

  const info = analyzePhone(body.phone);
  const waChatId =
    body.waChatId ?? (body.phone ? body.phone.replace(/\s/g, "") : body.name ?? null);

  const data = {
    name: body.name ?? null,
    rawPhone: body.phone ?? null,
    phone: info.e164 ?? body.phone ?? null,
    country: info.country,
    countryCode: info.countryCode,
    callingCode: info.callingCode,
    language: body.language ?? null,
    waChatId,
    status: body.status ?? "new",
    summary: body.summary ?? null,
    notes: body.notes ?? null,
    companyName: body.companyName ?? null,
    leadSource: body.leadSource ?? "other",
    dealStage: body.dealStage ?? "inquiry",
    email: body.email ?? null,
    lastContact: new Date(),
  };

  // 优先按规范化号码 upsert，其次 waChatId
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        info.e164 ? { phone: info.e164 } : undefined,
        waChatId ? { waChatId } : undefined,
        body.name ? { name: body.name } : undefined,
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
          companyName: data.companyName ?? existing.companyName,
          leadSource: data.leadSource ?? existing.leadSource,
          dealStage: data.dealStage ?? existing.dealStage,
          email: data.email ?? existing.email,
          waChatId: data.waChatId ?? existing.waChatId,
          lastContact: new Date(),
        },
      })
    : await prisma.customer.create({ data });

  return ok(customer, existing ? 200 : 201);
}

// DELETE /api/customers  批量删除 { "ids": ["..."] }
export async function DELETE(req: Request) {
  const user = await requireApiUser({ adminOnly: true });
  if (!user.ok) return fail(user.error, user.status);

  const body = await parseBody<{ ids?: string[] }>(req);
  if (!body.ids?.length) return fail("ids 必填");

  const result = await prisma.customer.deleteMany({
    where: { id: { in: body.ids } },
  });

  return ok({ deleted: result.count });
}
