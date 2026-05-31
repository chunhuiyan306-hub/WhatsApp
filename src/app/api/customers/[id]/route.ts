import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { analyzePhone } from "@/lib/phone";

// GET /api/customers/[id]  完整详情
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { timestamp: "asc" } },
      inquiries: { orderBy: { createdAt: "desc" } },
      enrichments: { orderBy: { createdAt: "desc" } },
      drafts: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!customer) return fail("客户不存在", 404);
  return ok(customer);
}

// PATCH /api/customers/[id]  更新字段
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{
    name?: string;
    phone?: string;
    language?: string;
    status?: string;
    summary?: string;
    notes?: string;
  }>(req);

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.language !== undefined) data.language = body.language;
  if (body.status !== undefined) data.status = body.status;
  if (body.summary !== undefined) data.summary = body.summary;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.phone !== undefined) {
    const info = analyzePhone(body.phone);
    data.rawPhone = body.phone;
    data.phone = info.e164 ?? body.phone;
    data.country = info.country;
    data.countryCode = info.countryCode;
    data.callingCode = info.callingCode;
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data,
    });
    return ok(customer);
  } catch {
    return fail("更新失败，客户可能不存在", 404);
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败，客户可能不存在", 404);
  }
}
