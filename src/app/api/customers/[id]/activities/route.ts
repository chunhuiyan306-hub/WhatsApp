import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { dealStageLabel } from "@/lib/constants";

/** GET /api/customers/[id]/activities */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const activities = await prisma.customerActivity.findMany({
    where: { customerId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok(activities);
}

/** POST /api/customers/[id]/activities */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<{
    type?: string;
    title?: string;
    content?: string;
  }>(req);

  if (!body.title?.trim()) return fail("请填写标题");

  const activity = await prisma.customerActivity.create({
    data: {
      customerId: params.id,
      type: body.type || "note",
      title: body.title.trim(),
      content: body.content?.trim() || null,
    },
  });
  return ok(activity);
}

/** 记录阶段变更 */
export async function logStageChange(
  customerId: string,
  from: string | null | undefined,
  to: string
) {
  if (from === to) return;
  await prisma.customerActivity.create({
    data: {
      customerId,
      type: "stage_change",
      title: `阶段：${dealStageLabel(from)} → ${dealStageLabel(to)}`,
    },
  });
}
