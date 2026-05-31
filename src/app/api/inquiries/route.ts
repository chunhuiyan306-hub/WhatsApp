import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

// POST /api/inquiries  记录一个需求
export async function POST(req: Request) {
  const body = await parseBody<{
    customerId: string;
    type: string;
    note?: string;
  }>(req);

  if (!body.customerId || !body.type) {
    return fail("customerId 与 type 必填");
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      customerId: body.customerId,
      type: body.type,
      note: body.note ?? null,
    },
  });
  return ok(inquiry, 201);
}

// DELETE /api/inquiries?id=
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return fail("缺少 id");
  try {
    await prisma.inquiry.delete({ where: { id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
