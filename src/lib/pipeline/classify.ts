export type InquiryType = "catalog" | "project" | "quote" | "other";

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
];

const INTERNAL_MARKERS = ["我去了解一下", "internal follow"];

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyMessages(
  texts: string[],
  meta?: { isBusinessAccount?: boolean; businessName?: string }
): ClassifyResult {
  const joined = norm(texts.filter(Boolean).join(" "));
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

  if (COMPETITOR_MARKERS.some((m) => joined.includes(m))) {
    return {
      inquiries: [{ type: "other", note: "疑似同行/供应商推广" }],
      highIntent: false,
      skipReason: "competitor",
    };
  }

  const onlyAutoReply =
    texts.length > 0 &&
    texts.every((t) => norm(t).includes(AUTO_REPLY) || norm(t).length < 5);
  if (onlyAutoReply) {
    return {
      inquiries: [{ type: "other", note: "待同步完整消息" }],
      highIntent: false,
      skipReason: "sync_pending",
    };
  }

  const inquiries: ClassifyResult["inquiries"] = [];

  if (/catalog|catalogue|brochure|画册|kitap|product catalog|send catalog|产品目录/.test(joined)) {
    inquiries.push({ type: "catalog", note: "要画册/目录" });
  }
  if (/pric|quote|quotation|pricing|how much|报价|价格|cost/.test(joined)) {
    inquiries.push({ type: "quote", note: "询价" });
  }
  if (/project|pergola|facade|cnc|villa|定制|custom|showroom|glass door|型材|组装|凉亭|立面/.test(joined)) {
    inquiries.push({ type: "project", note: "带项目/技术咨询" });
  }
  if (/facebook|instagram|can i get more info|more info on this|hello! can i get/.test(joined)) {
    if (!inquiries.length) {
      inquiries.push({ type: "other", note: "广告/社交引流咨询" });
    }
  }
  if (!inquiries.length) {
    inquiries.push({ type: "other", note: "其它咨询" });
  }

  const highIntent = inquiries.some((i) =>
    ["catalog", "project", "quote"].includes(i.type)
  );

  if (
    meta?.isBusinessAccount &&
    meta.businessName &&
    /wok|restaurant|餐厅|food|cafe/i.test(meta.businessName)
  ) {
    return {
      inquiries: [{ type: "other", note: "非目标客户（餐饮商业号）" }],
      highIntent: false,
      skipReason: "non_target_business",
    };
  }

  return { inquiries, highIntent };
}
