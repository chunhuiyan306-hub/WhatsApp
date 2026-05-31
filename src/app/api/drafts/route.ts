import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

// GET /api/drafts?status=pending  列出草稿（默认全部，可按状态过滤）
export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status")?.trim();
  const drafts = await prisma.replyDraft.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true, country: true } },
    },
  });
  return ok(drafts);
}

// POST /api/drafts  生成一条回复草稿
export async function POST(req: Request) {
  const body = await parseBody<{
    customerId: string;
    draftZh: string;
    draftTarget?: string;
    targetLang?: string;
  }>(req);

  if (!body.customerId || !body.draftZh) {
    return fail("customerId 与 draftZh 必填");
  }

  const draft = await prisma.replyDraft.create({
    data: {
      customerId: body.customerId,
      draftZh: body.draftZh,
      draftTarget: body.draftTarget ?? null,
      targetLang: body.targetLang ?? null,
      status: "pending",
    },
  });
  return ok(draft, 201);
}
