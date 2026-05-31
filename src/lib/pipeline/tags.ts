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
}): string[] {
  const tags = new Set<string>();

  const countryTag = input.country ? COUNTRY_TAGS[input.country] ?? input.country : null;
  if (countryTag) tags.add(countryTag);

  if (input.language === "ar") tags.add("阿拉伯客户");
  if (input.language === "zh") tags.add("中文客户");

  for (const q of input.inquiries) {
    if (q.type === "catalog") tags.add("要画册");
    if (q.type === "project") tags.add("带项目");
    if (q.type === "quote") tags.add("询价");
  }

  if (input.highIntent) tags.add("高意向");

  if (input.sourceHint?.includes("instagram")) tags.add("Instagram来源");
  if (input.sourceHint?.includes("facebook")) tags.add("Facebook来源");

  if (input.skipReason === "competitor") tags.add("待核实");
  if (input.skipReason === "internal") tags.add("内部/跟单");
  if (input.skipReason === "sync_pending") tags.add("待同步");
  if (input.skipReason === "non_target_business") tags.add("低优先级");

  return [...tags];
}
