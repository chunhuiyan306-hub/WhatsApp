import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { analyzePhone } from "@/lib/phone";
import { requireApiUser } from "@/lib/user-role";
import { logStageChange } from "./activities/route";

const PROFILE_FIELDS = [
  "name",
  "phone",
  "language",
  "status",
  "summary",
  "notes",
  "companyName",
  "jobTitle",
  "email",
  "website",
  "address",
  "productInterest",
  "quantity",
  "estimatedBudget",
  "expectedDelivery",
  "dealStage",
  "nextFollowUpAt",
  "assignedTo",
  "leadSource",
  "quoteAmount",
  "orderAmount",
] as const;

// GET /api/customers/[id]  完整详情
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { timestamp: "asc" } },
      inquiries: { orderBy: { createdAt: "desc" } },
      enrichments: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      drafts: { orderBy: { createdAt: "desc" } },
      tags: { include: { tag: true } },
    },
  });
  if (!customer) return fail("客户不存在", 404);
  return ok(customer);
}

// PATCH /api/customers/[id]  更新字段
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await parseBody<Record<string, unknown>>(req);

  const existing = await prisma.customer.findUnique({
    where: { id: params.id },
    select: { dealStage: true },
  });
  if (!existing) return fail("客户不存在", 404);

  const data: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] !== undefined) {
      if (key === "nextFollowUpAt") {
        data.nextFollowUpAt = body.nextFollowUpAt
          ? new Date(String(body.nextFollowUpAt))
          : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  if (body.phone !== undefined) {
    const info = analyzePhone(String(body.phone));
    data.rawPhone = body.phone;
    data.phone = info.e164 ?? body.phone;
    data.country = info.country;
    data.countryCode = info.countryCode;
    data.callingCode = info.callingCode;
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data,
    });

    if (
      body.dealStage !== undefined &&
      body.dealStage !== existing.dealStage
    ) {
      await logStageChange(
        params.id,
        existing.dealStage,
        String(body.dealStage)
      );
    }

    return ok(customer);
  } catch {
    return fail("更新失败", 404);
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireApiUser({ adminOnly: true });
  if (!user.ok) return fail(user.error, user.status);

  try {
    await prisma.customer.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch {
    return fail("删除失败，客户可能不存在", 404);
  }
}
