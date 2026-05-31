import type { ClassifyResult } from "./classify";

export function buildSummary(input: {
  name?: string | null;
  country?: string | null;
  classify: ClassifyResult;
  company?: string | null;
  latestMessageZh?: string;
}): string {
  const { classify: c } = input;
  const who = input.name || input.company || input.country || "未知地区客户";

  if (c.skipReason === "internal") {
    return `${who}，内部跟单消息，非海外客户。`;
  }
  if (c.skipReason === "competitor") {
    return `${who}，疑似同行/供应商推广，待核实。`;
  }
  if (c.skipReason === "sync_pending") {
    return `${input.country ?? ""}客户，Web 端未同步完整消息，待手机同步。`.replace(/^客户/, `${input.country}客户`);
  }
  if (c.skipReason === "non_target_business") {
    return `${who}，WhatsApp 商业账号非铝材/装修行业，低优先级。`;
  }

  const intent = c.inquiries
    .filter((i) => i.type !== "other")
    .map((i) => (i.type === "catalog" ? "要画册" : i.type === "quote" ? "询价" : "带项目"))
    .join("、");

  const base = intent
    ? `${input.country ?? ""}${who.includes(input.country ?? "___") ? who : who}，${intent}${c.highIntent ? "，意向较高" : ""}。`
    : `${input.country ?? ""}客户${input.name ? `（${input.name}）` : ""}，${c.inquiries[0]?.note ?? "咨询中"}。`;

  return base.replace(/\s+/g, " ").trim();
}
