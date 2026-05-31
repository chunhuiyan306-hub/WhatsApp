import { prisma } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/api";
import { analyzePhone } from "@/lib/phone";
import { runCustomerPipeline, type PipelineMeta } from "@/lib/pipeline";
import type { Prisma } from "@prisma/client";

const DEFAULT_COLORS = [
  "#25D366",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface IngestPayload {
  customer: {
    name?: string;
    phone?: string;
    waChatId?: string;
    language?: string;
    status?: string;
    summary?: string;
    notes?: string;
  };
  messages?: Array<{
    direction?: "in" | "out";
    originalText: string;
    originalLang?: string;
    translatedZh?: string;
    timestamp?: string;
  }>;
  inquiries?: Array<{ type: string; note?: string }>;
  tags?: string[];
  enrichment?: {
    linkedinUrl?: string;
    company?: string;
    role?: string;
    website?: string;
    source?: string;
    confidence?: string;
    note?: string;
  };
  draft?: {
    draftZh: string;
    draftTarget?: string;
    targetLang?: string;
  };
  /** 默认 true：ingest 后自动跑翻译/分类/标签/背景/草稿 */
  auto?: boolean;
  /** WhatsApp 资料页昵称，如 ~Lora Bergiy */
  waProfileName?: string;
  isBusinessAccount?: boolean;
  businessName?: string;
  sourceHint?: string;
}

// POST /api/ingest
// Agent 扫描一个 WhatsApp 会话后，用一次调用把客户、翻译后的消息、需求、标签、
// 背景调查与回复草稿一起写入。客户按 phone / waChatId upsert，消息去重。
export async function POST(req: Request) {
  const body = await parseBody<IngestPayload>(req);
  const c = body.customer;
  if (!c || (!c.phone && !c.waChatId && !c.name)) {
    return fail("customer 需要 name / phone / waChatId 之一");
  }

  const info = analyzePhone(c.phone);

  // 1) upsert 客户
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        info.e164 ? { phone: info.e164 } : undefined,
        c.waChatId ? { waChatId: c.waChatId } : undefined,
      ].filter(Boolean) as Prisma.CustomerWhereInput[],
    },
  });

  const baseData = {
    name: c.name ?? null,
    rawPhone: c.phone ?? null,
    phone: info.e164 ?? c.phone ?? null,
    country: info.country,
    countryCode: info.countryCode,
    callingCode: info.callingCode,
    language: c.language ?? null,
    waChatId: c.waChatId ?? null,
    summary: c.summary ?? null,
    notes: c.notes ?? null,
    status: c.status ?? "new",
    lastContact: new Date(),
  };

  const customer = existing
    ? await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: baseData.name ?? existing.name,
          summary: baseData.summary ?? existing.summary,
          notes: baseData.notes ?? existing.notes,
          language: baseData.language ?? existing.language,
          status: c.status ?? existing.status,
          country: baseData.country ?? existing.country,
          countryCode: baseData.countryCode ?? existing.countryCode,
          callingCode: baseData.callingCode ?? existing.callingCode,
          waChatId: baseData.waChatId ?? existing.waChatId,
          phone: baseData.phone ?? existing.phone,
          rawPhone: baseData.rawPhone ?? existing.rawPhone,
          lastContact: new Date(),
        },
      })
    : await prisma.customer.create({ data: baseData });

  // 2) 消息（去重：相同方向+原文+时间戳视为同一条）
  let addedMessages = 0;
  if (body.messages?.length) {
    for (const m of body.messages) {
      if (!m.originalText) continue;
      const ts = m.timestamp ? new Date(m.timestamp) : new Date();
      const dup = await prisma.message.findFirst({
        where: {
          customerId: customer.id,
          direction: m.direction ?? "in",
          originalText: m.originalText,
          timestamp: ts,
        },
      });
      if (dup) continue;
      await prisma.message.create({
        data: {
          customerId: customer.id,
          direction: m.direction ?? "in",
          originalText: m.originalText,
          originalLang: m.originalLang ?? null,
          translatedZh: m.translatedZh ?? null,
          timestamp: ts,
        },
      });
      addedMessages++;
    }
  }

  // 3) 需求（去重：相同 type 当天只记一次）
  if (body.inquiries?.length) {
    for (const q of body.inquiries) {
      if (!q.type) continue;
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const dup = await prisma.inquiry.findFirst({
        where: { customerId: customer.id, type: q.type, createdAt: { gte: since } },
      });
      if (dup) continue;
      await prisma.inquiry.create({
        data: { customerId: customer.id, type: q.type, note: q.note ?? null },
      });
    }
  }

  // 4) 标签
  if (body.tags?.length) {
    const count0 = await prisma.tag.count();
    let idx = count0;
    for (const name of body.tags) {
      if (!name?.trim()) continue;
      const tag = await prisma.tag.upsert({
        where: { name: name.trim() },
        update: {},
        create: {
          name: name.trim(),
          color: DEFAULT_COLORS[idx++ % DEFAULT_COLORS.length],
        },
      });
      await prisma.tagOnCustomer.upsert({
        where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
        update: {},
        create: { customerId: customer.id, tagId: tag.id, syncedToWa: false },
      });
    }
  }

  // 5) 背景调查
  if (body.enrichment) {
    const e = body.enrichment;
    await prisma.enrichment.create({
      data: {
        customerId: customer.id,
        linkedinUrl: e.linkedinUrl ?? null,
        company: e.company ?? null,
        role: e.role ?? null,
        website: e.website ?? null,
        source: e.source ?? null,
        confidence: e.confidence ?? "low",
        note: e.note ?? null,
        verified: false,
      },
    });
  }

  // 6) 回复草稿
  if (body.draft?.draftZh) {
    await prisma.replyDraft.create({
      data: {
        customerId: customer.id,
        draftZh: body.draft.draftZh,
        draftTarget: body.draft.draftTarget ?? null,
        targetLang: body.draft.targetLang ?? null,
        status: "pending",
      },
    });
  }

  const full = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      messages: { orderBy: { timestamp: "asc" } },
      inquiries: true,
      enrichments: true,
      drafts: true,
      tags: { include: { tag: true } },
    },
  });

  // 7) 全自动流水线（默认开启，传 auto:false 可跳过）
  let pipeline = null;
  const runAuto = body.auto !== false;
  if (runAuto) {
    const meta: PipelineMeta = {
      waProfileName: body.waProfileName ?? c.name ?? undefined,
      isBusinessAccount: body.isBusinessAccount,
      businessName: body.businessName,
      sourceHint: body.sourceHint,
    };
    pipeline = await runCustomerPipeline(customer.id, meta);
    const after = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: {
        messages: { orderBy: { timestamp: "asc" } },
        inquiries: true,
        enrichments: true,
        drafts: true,
        tags: { include: { tag: true } },
      },
    });
    return ok(
      { customer: after, addedMessages, created: !existing, pipeline },
      existing ? 200 : 201
    );
  }

  return ok({ customer: full, addedMessages, created: !existing, pipeline }, existing ? 200 : 201);
}
