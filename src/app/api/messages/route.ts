import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";

// POST /api/messages  新增一条消息（含原文与中文翻译）
export async function POST(req: Request) {
  const body = await parseBody<{
    customerId: string;
    direction?: "in" | "out";
    originalText: string;
    originalLang?: string;
    translatedZh?: string;
    timestamp?: string;
  }>(req);

  if (!body.customerId || !body.originalText) {
    return fail("customerId 与 originalText 必填");
  }

  const ts = body.timestamp ? new Date(body.timestamp) : new Date();
  const message = await prisma.message.create({
    data: {
      customerId: body.customerId,
      direction: body.direction ?? "in",
      originalText: body.originalText,
      originalLang: body.originalLang ?? null,
      translatedZh: body.translatedZh ?? null,
      timestamp: ts,
    },
  });

  await prisma.customer.update({
    where: { id: body.customerId },
    data: { lastContact: ts },
  });

  return ok(message, 201);
}
