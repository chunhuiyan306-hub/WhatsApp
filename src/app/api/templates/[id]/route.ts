import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{
    name?: string;
    inquiryType?: string;
    targetLang?: string;
    draftTarget?: string;
    draftZh?: string;
    attachAssetIds?: string[];
    isDefault?: boolean;
    sortOrder?: number;
  }>(req);

  if (body.isDefault && body.inquiryType !== undefined) {
    await prisma.replyTemplate.updateMany({
      where: {
        inquiryType: body.inquiryType,
        targetLang: body.targetLang ?? "all",
        isDefault: true,
        NOT: { id: params.id },
      },
      data: { isDefault: false },
    });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.inquiryType !== undefined) data.inquiryType = body.inquiryType;
  if (body.targetLang !== undefined) data.targetLang = body.targetLang;
  if (body.draftTarget !== undefined) data.draftTarget = body.draftTarget;
  if (body.draftZh !== undefined) data.draftZh = body.draftZh;
  if (body.attachAssetIds !== undefined) {
    data.attachAssetIds = body.attachAssetIds.length
      ? JSON.stringify(body.attachAssetIds)
      : null;
  }
  if (body.isDefault !== undefined) data.isDefault = body.isDefault;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  try {
    const t = await prisma.replyTemplate.update({
      where: { id: params.id },
      data,
    });
    return ok(t);
  } catch {
    return fail("模板不存在", 404);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.replyTemplate.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
