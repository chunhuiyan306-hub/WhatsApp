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

// GET /api/tags  列出所有标签及使用数量
export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { customers: true } } },
  });
  return ok(tags);
}

// POST /api/tags  新建标签（按 name upsert）
export async function POST(req: Request) {
  const body = await parseBody<{ name: string; color?: string }>(req);
  if (!body.name?.trim()) return fail("标签名必填");

  const count = await prisma.tag.count();
  const tag = await prisma.tag.upsert({
    where: { name: body.name.trim() },
    update: { color: body.color ?? undefined },
    create: {
      name: body.name.trim(),
      color: body.color ?? DEFAULT_COLORS[count % DEFAULT_COLORS.length],
    },
  });
  return ok(tag, 201);
}
