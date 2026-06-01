import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

/** PATCH /api/tags/[id]  修改标签名/颜色 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{ name?: string; color?: string }>(req);
  if (!body.name?.trim() && body.color === undefined) {
    return fail("需要 name 或 color");
  }

  try {
    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
      },
    });
    return ok(tag);
  } catch {
    return fail("更新失败，标签名可能重复", 409);
  }
}

/** DELETE /api/tags/[id]  删除标签（同时解除客户关联） */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tag.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
