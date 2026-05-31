import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

const DEFAULT_COLORS = [
  "#25D366",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// POST /api/customers/[id]/tags  给客户加标签（按 tagId 或 name）
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{
    tagId?: string;
    name?: string;
    color?: string;
  }>(req);

  let tagId = body.tagId;
  if (!tagId) {
    if (!body.name?.trim()) return fail("需要 tagId 或 name");
    const count = await prisma.tag.count();
    const tag = await prisma.tag.upsert({
      where: { name: body.name.trim() },
      update: {},
      create: {
        name: body.name.trim(),
        color: body.color ?? DEFAULT_COLORS[count % DEFAULT_COLORS.length],
      },
    });
    tagId = tag.id;
  }

  await prisma.tagOnCustomer.upsert({
    where: { customerId_tagId: { customerId: params.id, tagId } },
    update: {},
    create: { customerId: params.id, tagId, syncedToWa: false },
  });

  return ok({ customerId: params.id, tagId }, 201);
}

// PATCH /api/customers/[id]/tags  标记标签已同步到 WhatsApp Web
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{ tagId: string; syncedToWa?: boolean }>(req);
  if (!body.tagId) return fail("tagId 必填");
  const rel = await prisma.tagOnCustomer.update({
    where: { customerId_tagId: { customerId: params.id, tagId: body.tagId } },
    data: { syncedToWa: body.syncedToWa ?? true },
  });
  return ok(rel);
}

// DELETE /api/customers/[id]/tags?tagId=
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const tagId = new URL(req.url).searchParams.get("tagId");
  if (!tagId) return fail("缺少 tagId");
  try {
    await prisma.tagOnCustomer.delete({
      where: { customerId_tagId: { customerId: params.id, tagId } },
    });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
