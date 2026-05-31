import { prisma } from "@/lib/db";
import { parseAssetIds } from "@/lib/storage";
import type { InquiryType } from "@/lib/pipeline/classify";

/** 按需求类型和语言取最佳话术模板 */
export async function resolveTemplate(
  inquiryType: InquiryType,
  language?: string | null
) {
  const lang = language ?? "en";
  const candidates = await prisma.replyTemplate.findMany({
    where: {
      OR: [
        { inquiryType, targetLang: lang },
        { inquiryType, targetLang: "all" },
        { inquiryType: "all", targetLang: lang },
        { inquiryType: "all", targetLang: "all" },
      ],
    },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  });
  return candidates[0] ?? null;
}

export async function resolveAttachmentsForTemplate(templateId: string | null) {
  if (!templateId) return [];
  const t = await prisma.replyTemplate.findUnique({ where: { id: templateId } });
  if (!t?.attachAssetIds) return [];
  const ids = parseAssetIds(t.attachAssetIds);
  if (!ids.length) return [];
  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.fileUrl,
    category: a.category,
  }));
}

/** 按需求类型取默认附带资料（如画册类 PDF） */
export async function resolveDefaultAssets(inquiryType: InquiryType) {
  const cat =
    inquiryType === "catalog"
      ? "catalog"
      : inquiryType === "quote"
        ? "quote"
        : inquiryType === "project"
          ? "profile"
          : null;
  if (!cat) return [];
  const assets = await prisma.mediaAsset.findMany({
    where: { category: cat },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.fileUrl,
    category: a.category,
  }));
}
