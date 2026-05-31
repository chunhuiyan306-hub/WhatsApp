// 需求类型
export const INQUIRY_TYPES = [
  { value: "catalog", label: "要画册" },
  { value: "project", label: "带项目" },
  { value: "quote", label: "询价" },
  { value: "other", label: "其它" },
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number]["value"];

export function inquiryLabel(value?: string | null): string {
  return INQUIRY_TYPES.find((t) => t.value === value)?.label ?? value ?? "其它";
}

// 客户状态
export const CUSTOMER_STATUSES = [
  { value: "new", label: "新客", color: "#3b82f6" },
  { value: "contacted", label: "已联系", color: "#8b5cf6" },
  { value: "following", label: "跟进中", color: "#f59e0b" },
  { value: "closed", label: "已关闭", color: "#6b7280" },
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]["value"];

export function statusLabel(value?: string | null): string {
  return (
    CUSTOMER_STATUSES.find((s) => s.value === value)?.label ?? value ?? "新客"
  );
}

export function statusColor(value?: string | null): string {
  return (
    CUSTOMER_STATUSES.find((s) => s.value === value)?.color ?? "#6b7280"
  );
}

// 回复草稿状态
export const DRAFT_STATUSES = [
  { value: "pending", label: "待确认" },
  { value: "approved", label: "已确认待发" },
  { value: "sent", label: "已发送" },
  { value: "rejected", label: "已否决" },
] as const;

export function draftStatusLabel(value?: string | null): string {
  return (
    DRAFT_STATUSES.find((s) => s.value === value)?.label ?? value ?? "待确认"
  );
}

// 阿拉伯语等 RTL 语言判断
const RTL_LANGS = new Set(["ar", "he", "fa", "ur", "ps", "sd", "dv"]);
export function isRtlLang(lang?: string | null): boolean {
  if (!lang) return false;
  return RTL_LANGS.has(lang.toLowerCase().slice(0, 2));
}

// 简单基于字符的 RTL 文本探测（无语言标记时兜底）
export function looksRtl(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}
