import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { classifyMessages } from "./classify";
import { buildAutoTags } from "./tags";
import { buildSummary } from "./summary";
import { buildAutoEnrichment } from "./enrich";
import { buildAutoDraft } from "./draft";
import { translateToZh } from "./translate";
import { detectLanguage } from "./detect-lang";
import { inferCustomerStage } from "./stage";

const DEFAULT_COLORS = [
  "#25D366",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export interface PipelineMeta {
  waProfileName?: string;
  isBusinessAccount?: boolean;
  businessName?: string;
  sourceHint?: string;
}

export interface PipelineResult {
  customerId: string;
  translatedMessages: number;
  inquiriesAdded: number;
  tagsAdded: number;
  enrichmentCreated: boolean;
  draftCreated: boolean;
  summaryUpdated: boolean;
  skipReason?: string;
}

async function upsertTags(customerId: string, names: string[]) {
  let added = 0;
  const count0 = await prisma.tag.count();
  let idx = count0;
  for (const name of names) {
    if (!name?.trim()) continue;
    const tag = await prisma.tag.upsert({
      where: { name: name.trim() },
      update: {},
      create: {
        name: name.trim(),
        color: DEFAULT_COLORS[idx++ % DEFAULT_COLORS.length],
      },
    });
    const existing = await prisma.tagOnCustomer.findUnique({
      where: { customerId_tagId: { customerId, tagId: tag.id } },
    });
    if (!existing) {
      await prisma.tagOnCustomer.create({
        data: { customerId, tagId: tag.id, syncedToWa: false },
      });
      added++;
    }
  }
  return added;
}

/** 对单个客户运行全自动流水线：翻译 → 分类 → 标签 → 画像 → 背景 → 草稿 */
export async function runCustomerPipeline(
  customerId: string,
  meta: PipelineMeta = {},
  options: { forceEnrich?: boolean; forceDraft?: boolean } = {}
): Promise<PipelineResult> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      messages: { orderBy: { timestamp: "asc" } },
      inquiries: true,
      enrichments: { orderBy: { createdAt: "desc" }, take: 1 },
      drafts: { where: { status: { in: ["pending", "approved"] } } },
    },
  });

  if (!customer) throw new Error(`客户不存在: ${customerId}`);

  const result: PipelineResult = {
    customerId,
    translatedMessages: 0,
    inquiriesAdded: 0,
    tagsAdded: 0,
    enrichmentCreated: false,
    draftCreated: false,
    summaryUpdated: false,
  };

  // 1) 翻译缺失的消息
  for (const m of customer.messages) {
    if (m.translatedZh?.trim()) continue;
    const { lang, zh } = await translateToZh(
      m.originalText,
      m.originalLang ?? undefined
    );
    await prisma.message.update({
      where: { id: m.id },
      data: {
        translatedZh: zh,
        originalLang: m.originalLang ?? lang,
      },
    });
    result.translatedMessages++;
  }

  const refreshed = await prisma.message.findMany({
    where: { customerId },
    orderBy: { timestamp: "asc" },
  });

  // 分类/标签/阶段仅基于最近 10 条对话
  const recentMsgs = refreshed.slice(-10).map((m) => ({
    direction: m.direction,
    originalText: m.originalText,
  }));

  const inTexts = recentMsgs
    .filter((m) => m.direction !== "out")
    .map((m) => m.originalText);
  const inTextsZh = refreshed
    .filter((m) => m.direction !== "out")
    .slice(-10)
    .map((m) => m.translatedZh ?? m.originalText);

  const displayName =
    meta.waProfileName?.replace(/^~/, "") ||
    customer.name ||
    meta.businessName ||
    null;

  // 2) 分类（最近 10 条，含 in/out）
  const classify = classifyMessages(recentMsgs, {
    isBusinessAccount: meta.isBusinessAccount,
    businessName: meta.businessName,
  });
  result.skipReason = classify.skipReason;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  for (const q of classify.inquiries) {
    const dup = await prisma.inquiry.findFirst({
      where: { customerId, type: q.type, createdAt: { gte: since } },
    });
    if (!dup) {
      await prisma.inquiry.create({
        data: { customerId, type: q.type, note: q.note ?? null },
      });
      result.inquiriesAdded++;
    }
  }

  // 3) 语言
  const primaryLang =
    customer.language ??
    detectLanguage(inTexts.join(" ") || inTextsZh.join(" "));

  // 4) 标签
  const tagNames = buildAutoTags({
    country: customer.country,
    language: primaryLang,
    inquiries: classify.inquiries,
    highIntent: classify.highIntent,
    skipReason: classify.skipReason,
    sourceHint: meta.sourceHint,
    messages: recentMsgs,
  });
  result.tagsAdded = await upsertTags(customerId, tagNames);

  // 5) 背景调查
  const sinceEnrich = new Date();
  sinceEnrich.setHours(0, 0, 0, 0);
  const enrichmentToday = await prisma.enrichment.count({
    where: { customerId, createdAt: { gte: sinceEnrich } },
  });
  const enrichData = buildAutoEnrichment({
    name: displayName,
    phone: customer.phone,
    country: customer.country,
    countryCode: customer.countryCode,
    isBusinessAccount: meta.isBusinessAccount,
    businessName: meta.businessName,
    messageText: inTexts.join("\n"),
  });

  if (enrichmentToday === 0 || options.forceEnrich) {
    await prisma.enrichment.create({
      data: {
        customerId,
        ...enrichData,
        verified: false,
      },
    });
    result.enrichmentCreated = true;
  }

  // 6) 画像 + 状态
  const summary = buildSummary({
    name: displayName,
    country: customer.country,
    classify,
    company: enrichData.company,
    latestMessageZh: inTextsZh[inTextsZh.length - 1],
  });

  let status = customer.status;
  let dealStage = customer.dealStage ?? "inquiry";
  if (classify.skipReason === "internal" || classify.skipReason === "competitor") {
    status = "following";
  } else if (classify.skipReason === "non_target_business") {
    status = "following";
  }

  const inferred = inferCustomerStage({
    messages: recentMsgs,
    inquiries: classify.inquiries,
    highIntent: classify.highIntent,
    skipReason: classify.skipReason,
  });
  status = inferred.status;
  dealStage = inferred.dealStage;

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: displayName ?? customer.name,
      language: primaryLang,
      summary,
      status,
      dealStage,
      leadSource: meta.sourceHint?.includes("instagram")
        ? "instagram"
        : meta.sourceHint?.includes("facebook")
          ? "facebook"
          : customer.leadSource ?? "whatsapp",
      notes:
        classify.skipReason === "sync_pending"
          ? "需手机同步查看客户原始消息"
          : customer.notes,
    },
  });
  result.summaryUpdated = true;

  // 7) 草稿（跳过无效线索）
  const skipDraft = [
    "internal",
    "competitor",
    "sync_pending",
    "non_target_business",
  ].includes(classify.skipReason ?? "");

  const pendingDraftCount = await prisma.replyDraft.count({
    where: { customerId, status: { in: ["pending", "approved"] } },
  });
  const hasPendingDraft = pendingDraftCount > 0;
  if (!skipDraft && (!hasPendingDraft || options.forceDraft)) {
    const draft = await buildAutoDraft({
      language: primaryLang,
      inquiries: classify.inquiries,
      customerName: displayName,
    });
    if (draft) {
      await prisma.replyDraft.create({
        data: {
          customerId,
          draftZh: draft.draftZh,
          draftTarget: draft.draftTarget,
          targetLang: draft.targetLang,
          templateId: draft.templateId ?? null,
          attachments: draft.attachments?.length
            ? JSON.stringify(draft.attachments)
            : null,
          status: "pending",
        },
      });
      result.draftCreated = true;
    }
  }

  return result;
}

/** 批量处理所有客户或指定 ID 列表 */
export async function runPipelineBatch(
  customerIds?: string[],
  metaByCustomer?: Record<string, PipelineMeta>
) {
  const ids =
    customerIds ??
    (await prisma.customer.findMany({ select: { id: true } })).map((c) => c.id);

  const results: PipelineResult[] = [];
  for (const id of ids) {
    try {
      results.push(
        await runCustomerPipeline(id, metaByCustomer?.[id] ?? {}, {
          forceEnrich: true,
        })
      );
    } catch (e) {
      results.push({
        customerId: id,
        translatedMessages: 0,
        inquiriesAdded: 0,
        tagsAdded: 0,
        enrichmentCreated: false,
        draftCreated: false,
        summaryUpdated: false,
        skipReason: e instanceof Error ? e.message : "error",
      });
    }
  }
  return results;
}

/** 写入自动化日志 */
export async function logAutomation(
  action: string,
  status: string,
  summary?: string,
  detail?: string
) {
  try {
    await prisma.automationLog.create({
      data: { action, status, summary: summary ?? null, detail: detail ?? null },
    });
  } catch {
    /* 表未迁移时忽略 */
  }

  try {
    await prisma.automationState.upsert({
      where: { id: "default" },
      update: {
        lastScanAt: action === "scan" ? new Date() : undefined,
        lastScanStatus: status,
        lastScanSummary: summary ?? null,
      },
      create: {
        id: "default",
        lastScanAt: action === "scan" ? new Date() : undefined,
        lastScanStatus: status,
        lastScanSummary: summary ?? null,
      },
    });
  } catch {
    /* ignore */
  }
}
