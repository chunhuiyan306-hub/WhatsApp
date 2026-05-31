import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryType = searchParams.get("inquiryType");
  const targetLang = searchParams.get("targetLang");

  const templates = await prisma.replyTemplate.findMany({
    where: {
      ...(inquiryType
        ? { OR: [{ inquiryType }, { inquiryType: "all" }] }
        : {}),
      ...(targetLang
        ? { OR: [{ targetLang }, { targetLang: "all" }] }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return ok(templates);
}

export async function POST(req: Request) {
  const body = await parseBody<{
    name: string;
    inquiryType?: string;
    targetLang?: string;
    draftTarget: string;
    draftZh: string;
    attachAssetIds?: string[];
    isDefault?: boolean;
    sortOrder?: number;
  }>(req);

  if (!body.name || !body.draftTarget || !body.draftZh) {
    return fail("name / draftTarget / draftZh 必填");
  }

  if (body.isDefault) {
    await prisma.replyTemplate.updateMany({
      where: {
        inquiryType: body.inquiryType ?? "all",
        targetLang: body.targetLang ?? "all",
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  const t = await prisma.replyTemplate.create({
    data: {
      name: body.name,
      inquiryType: body.inquiryType ?? "all",
      targetLang: body.targetLang ?? "en",
      draftTarget: body.draftTarget,
      draftZh: body.draftZh,
      attachAssetIds: body.attachAssetIds?.length
        ? JSON.stringify(body.attachAssetIds)
        : null,
      isDefault: body.isDefault ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return ok(t, 201);
}
