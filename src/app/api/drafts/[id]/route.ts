import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

// PATCH /api/drafts/[id]  更新草稿内容或状态
// status: pending -> approved（你确认）-> sent（我发送后回写）/ rejected
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{
    draftZh?: string;
    draftTarget?: string;
    targetLang?: string;
    attachments?: string;
    status?: "pending" | "approved" | "sent" | "rejected";
  }>(req);

  const data: Record<string, unknown> = {};
  if (body.draftZh !== undefined) data.draftZh = body.draftZh;
  if (body.draftTarget !== undefined) data.draftTarget = body.draftTarget;
  if (body.targetLang !== undefined) data.targetLang = body.targetLang;
  if (body.attachments !== undefined) data.attachments = body.attachments;
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "sent") data.sentAt = new Date();
  }

  try {
    const draft = await prisma.replyDraft.update({
      where: { id: params.id },
      data,
    });

    // 草稿被发送后，同时作为一条 out 消息写入对话时间线
    if (body.status === "sent") {
      await prisma.message.create({
        data: {
          customerId: draft.customerId,
          direction: "out",
          originalText: draft.draftTarget ?? draft.draftZh,
          originalLang: draft.targetLang ?? null,
          translatedZh: draft.draftZh,
          timestamp: new Date(),
        },
      });
      await prisma.customer.update({
        where: { id: draft.customerId },
        data: { lastContact: new Date(), status: "contacted" },
      });
    }

    return ok(draft);
  } catch {
    return fail("更新失败，草稿可能不存在", 404);
  }
}

// DELETE /api/drafts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.replyDraft.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败", 404);
  }
}
