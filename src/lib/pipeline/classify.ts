export type InquiryType = "catalog" | "project" | "quote" | "other";

export interface ClassifyMessage {
  direction?: string;
  originalText: string;
}

export interface ClassifyResult {
  inquiries: Array<{ type: InquiryType; note?: string }>;
  highIntent: boolean;
  skipReason?: string;
}

const AUTO_REPLY =
  "thank you for your message. we're unavailable right now, but will respond as soon as possible";

const COMPETITOR_MARKERS = [
  "gainer located in foshan",
  "flexing living",
  "our factory named gainer",
  "oem/odm service",
  "we are factory",
  "we are manufacturer",
  "promote our product",
  "cooperation partner",
];

const INTERNAL_MARKERS = ["我去了解一下", "internal follow", "let me check with"];

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeInput(
  input: string[] | ClassifyMessage[]
): ClassifyMessage[] {
  if (!input.length) return [];
  if (typeof input[0] === "string") {
    return (input as string[]).map((originalText) => ({
      direction: "in",
      originalText,
    }));
  }
  return input as ClassifyMessage[];
}

/** 基于最近若干条对话（含 in/out）识别需求类型 */
export function classifyMessages(
  input: string[] | ClassifyMessage[],
  meta?: { isBusinessAccount?: boolean; businessName?: string }
): ClassifyResult {
  const messages = normalizeInput(input);
  const inTexts = messages
    .filter((m) => m.direction !== "out")
    .map((m) => m.originalText);
  const outTexts = messages
    .filter((m) => m.direction === "out")
    .map((m) => m.originalText);
  const allTexts = messages.map((m) => m.originalText);

  const joined = norm(allTexts.join(" "));
  const inJoined = norm(inTexts.join(" "));

  if (!joined) {
    return { inquiries: [{ type: "other", note: "无消息内容" }], highIntent: false };
  }

  if (INTERNAL_MARKERS.some((m) => joined.includes(norm(m)))) {
    return {
      inquiries: [{ type: "other", note: "内部跟进" }],
      highIntent: false,
      skipReason: "internal",
    };
  }

  if (COMPETITOR_MARKERS.some((m) => joined.includes(norm(m)))) {
    return {
      inquiries: [{ type: "other", note: "疑似同行/供应商推广" }],
      highIntent: false,
      skipReason: "competitor",
    };
  }

  const onlyAutoReply =
    allTexts.length > 0 &&
    allTexts.every((t) => norm(t).includes(AUTO_REPLY) || norm(t).length < 5);
  if (onlyAutoReply) {
    return {
      inquiries: [{ type: "other", note: "待同步完整消息" }],
      highIntent: false,
      skipReason: "sync_pending",
    };
  }

  const inquiries: ClassifyResult["inquiries"] = [];

  // 要画册 — 客户主动要
  if (
    /catalog|catalogue|brochure|画册|产品目录|产品册|send (me )?(your )?(catalog|brochure|pdf)|kitap|folleto|catálogo|e-?catalog|产品资料|图册|sample book|lookbook/.test(
      inJoined
    )
  ) {
    inquiries.push({ type: "catalog", note: "要画册/目录" });
  }

  // 询价
  if (
    /pric|quote|quotation|pricing|how much|unit price|fob|cif|moq|rate|offer|报价|价格|多少钱|单价|询价|pi\b|proforma|invoice|cost per|best price|discount/.test(
      inJoined
    )
  ) {
    inquiries.push({ type: "quote", note: "询价/报价" });
  }

  // 带项目 / 技术
  if (
    /project|pergola|facade|cnc|villa|hotel|residential|commercial|showroom|glass door|curtain wall|cladding|sintered|porcelain|slab|岩板|大板|型材|组装|凉亭|立面|定制|custom|drawing|design|layout|spec|installation|measurement|sqm|sq\.?\s*m|square meter|项目|工程|方案|效果图|图纸|render|3d|quantity|container|柜|吨/.test(
      inJoined
    )
  ) {
    inquiries.push({ type: "project", note: "带项目/技术咨询" });
  }

  // 社交广告引流
  if (
    /facebook|instagram|can i get more info|more info on this|hello! can i get|saw your ad|from your post|看到广告|抖音|tiktok/.test(
      inJoined
    )
  ) {
    if (!inquiries.length) {
      inquiries.push({ type: "other", note: "广告/社交引流咨询" });
    }
  }

  // 仅我方发了画册但客户还没明确需求
  if (
    !inquiries.length &&
    /catalog|brochure|画册|attached|attachment|pdf|请查收|please find/.test(
      norm(outTexts.join(" "))
    )
  ) {
    inquiries.push({ type: "catalog", note: "已发画册待反馈" });
  }

  if (!inquiries.length) {
    const greetingOnly =
      inJoined.length < 40 &&
      /^(hi|hello|hey|good morning|good afternoon|salam|مرحب|你好|在吗|您好)[!.?\s]*$/i.test(
        inJoined
      );
    inquiries.push({
      type: "other",
      note: greetingOnly ? "打招呼/待明确需求" : "其它咨询",
    });
  }

  const highIntent = inquiries.some(
    (i) =>
      ["catalog", "project", "quote"].includes(i.type) &&
      i.note !== "已发画册待反馈"
  );

  if (
    meta?.isBusinessAccount &&
    meta.businessName &&
    /wok|restaurant|餐厅|food|cafe|pizza|burger|delivery/i.test(meta.businessName)
  ) {
    return {
      inquiries: [{ type: "other", note: "非目标客户（餐饮商业号）" }],
      highIntent: false,
      skipReason: "non_target_business",
    };
  }

  return { inquiries, highIntent };
}
