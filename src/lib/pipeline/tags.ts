import type { InquiryType } from "./classify";

const COUNTRY_TAGS: Record<string, string> = {
  美国: "美国",
  英国: "英国",
  阿联酋: "阿联酋",
  沙特阿拉伯: "沙特阿拉伯",
  马来西亚: "马来西亚",
  新加坡: "新加坡",
  泰国: "泰国",
  墨西哥: "墨西哥",
  缅甸: "缅甸",
  MM: "缅甸",
};

export function buildAutoTags(input: {
  country?: string | null;
  language?: string | null;
  inquiries: Array<{ type: InquiryType; note?: string }>;
  highIntent: boolean;
  skipReason?: string;
  sourceHint?: string | null;
  messages?: Array<{ direction: string; originalText?: string }>;
}): string[] {
  const tags = new Set<string>();
  const recent = (input.messages ?? []).slice(-10);
  const last = recent[recent.length - 1];
  const inText = recent
    .filter((m) => m.direction !== "out")
    .map((m) => m.originalText ?? "")
    .join(" ");
  const outText = recent
    .filter((m) => m.direction === "out")
    .map((m) => m.originalText ?? "")
    .join(" ");

  const countryTag = input.country ? COUNTRY_TAGS[input.country] ?? input.country : null;
  if (countryTag) tags.add(countryTag);

  if (input.language === "ar") tags.add("阿拉伯客户");
  if (input.language === "zh") tags.add("中文客户");
  if (input.language === "es") tags.add("西语客户");
  if (input.language === "fr") tags.add("法语客户");

  for (const q of input.inquiries) {
    if (q.type === "catalog") tags.add("要画册");
    if (q.type === "project") tags.add("带项目");
    if (q.type === "quote") tags.add("询价");
    if (q.note === "打招呼/待明确需求") tags.add("待明确需求");
    if (q.note === "已发画册待反馈") tags.add("已发画册");
    if (q.note === "广告/社交引流咨询") tags.add("广告引流");
  }

  if (input.highIntent) tags.add("高意向");

  if (last) {
    if (last.direction !== "out") tags.add("待回复");
    else tags.add("已回复");
  }

  if (/urgent|asap|尽快|急|rush|immediately/i.test(inText)) tags.add("急单");

  if (/catalog|brochure|画册|pdf|attached/i.test(outText)) tags.add("已发画册");
  if (/quot|报价|price list|pi\b|proforma/i.test(outText)) tags.add("已报价");

  if (input.sourceHint?.includes("instagram")) tags.add("Instagram来源");
  if (input.sourceHint?.includes("facebook")) tags.add("Facebook来源");

  if (input.skipReason === "competitor") tags.add("同行/推广");
  if (input.skipReason === "internal") tags.add("内部/跟单");
  if (input.skipReason === "sync_pending") tags.add("待同步");
  if (input.skipReason === "non_target_business") tags.add("低优先级");

  return [...tags];
}
