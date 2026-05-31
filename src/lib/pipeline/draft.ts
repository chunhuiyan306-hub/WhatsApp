import type { InquiryType } from "./classify";
import {
  resolveTemplate,
  resolveAttachmentsForTemplate,
  resolveDefaultAssets,
} from "@/lib/templates";

export interface DraftResult {
  draftZh: string;
  draftTarget: string;
  targetLang: string;
  templateId?: string;
  attachments?: Array<{ id: string; name: string; url: string; category: string }>;
}

const FALLBACK: Record<
  string,
  Partial<Record<InquiryType | "default", { en: string; zh: string; ar?: string }>>
> = {
  default: {
    catalog: {
      en: "Hello! Thank you for contacting Gainer. I'll send you our latest product catalog shortly. May I know your project type and approximate quantity?",
      zh: "您好！感谢联系 Gainer。我马上发最新产品画册。请问项目是商用还是住宅？大概数量多少？",
      ar: "مرحبًا! شكرًا لتواصلك مع Gainer. سأرسل لك الكتالوج قريبًا. ما نوع المشروع والكمية التقريبية؟",
    },
    quote: {
      en: "Hello! Thanks for your inquiry. I'll prepare a quotation for you. Could you share the product model, dimensions, and quantity?",
      zh: "您好！感谢询价。我会为您准备报价，请提供产品型号、尺寸和数量。",
    },
    project: {
      en: "Hello! Thank you for sharing your project details. Our team will review and send relevant profiles, drawings, and a proposal. Could you share project location and timeline?",
      zh: "您好！感谢分享项目信息。我们会评估后发送相关型材图与方案，请问项目地点和工期？",
      ar: "مرحبًا! شكرًا لتفاصيل المشروع. سنرسل الملفات والعرض المناسب. ما موقع المشروع والجدول الزمني؟",
    },
    other: {
      en: "Hello! Thanks for reaching out to Gainer. Which product are you interested in? I'll send you details and our catalog.",
      zh: "您好！感谢联系 Gainer。请问您对哪款产品感兴趣？我会发详细资料和画册。",
    },
    default: {
      en: "Hello! Thanks for contacting Gainer. How can we assist you today?",
      zh: "您好！感谢联系 Gainer，请问有什么可以帮您？",
    },
  },
};

/** 优先使用看板里自定义话术 + 绑定 PDF，否则用内置默认 */
export async function buildAutoDraft(input: {
  language?: string | null;
  inquiries: Array<{ type: InquiryType }>;
  customerName?: string | null;
}): Promise<DraftResult | null> {
  const lang = input.language ?? "en";
  const primary =
    input.inquiries.find((i) => i.type !== "other")?.type ??
    input.inquiries[0]?.type ??
    "other";

  const custom = await resolveTemplate(primary, lang);
  if (custom) {
    let attachments = await resolveAttachmentsForTemplate(custom.id);
    if (!attachments.length) {
      attachments = await resolveDefaultAssets(primary);
    }
    return {
      draftZh: custom.draftZh,
      draftTarget: custom.draftTarget,
      targetLang: custom.targetLang === "all" ? lang : custom.targetLang,
      templateId: custom.id,
      attachments,
    };
  }

  const pack = FALLBACK.default[primary] ?? FALLBACK.default.default!;
  let draftTarget = pack.en;
  let targetLang = "en";

  if (lang === "ar" && pack.ar) {
    draftTarget = pack.ar;
    targetLang = "ar";
  } else if (lang === "zh") {
    draftTarget = pack.zh;
    targetLang = "zh";
  }

  const attachments = await resolveDefaultAssets(primary);

  return {
    draftZh: pack.zh,
    draftTarget,
    targetLang,
    attachments,
  };
}
