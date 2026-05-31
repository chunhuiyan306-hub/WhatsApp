import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{ name?: string; category?: string }>(req);
  try {
    const asset = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: body,
    });
    return ok(asset);
  } catch {
    return fail("资料不存在", 404);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mediaAsset.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
