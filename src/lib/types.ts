// 前端使用的轻量类型（与 Prisma 模型对应，避免在客户端引入 Prisma 类型）

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

export interface TagOnCustomer {
  tagId: string;
  syncedToWa: boolean;
  tag: Tag;
}

export interface Message {
  id: string;
  direction: "in" | "out" | string;
  originalText: string;
  originalLang?: string | null;
  translatedZh?: string | null;
  timestamp: string;
}

export interface Inquiry {
  id: string;
  type: string;
  note?: string | null;
  createdAt: string;
}

export interface Enrichment {
  id: string;
  linkedinUrl?: string | null;
  company?: string | null;
  role?: string | null;
  website?: string | null;
  source?: string | null;
  confidence: string;
  verified: boolean;
  note?: string | null;
  createdAt: string;
}

export interface CustomerActivity {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  createdAt: string;
}

export interface ReplyDraft {
  id: string;
  draftZh: string;
  draftTarget?: string | null;
  targetLang?: string | null;
  attachments?: string | null;
  templateId?: string | null;
  status: string;
  sentAt?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    country?: string | null;
  };
}

export interface Customer {
  id: string;
  name?: string | null;
  phone?: string | null;
  rawPhone?: string | null;
  country?: string | null;
  countryCode?: string | null;
  callingCode?: string | null;
  language?: string | null;
  waChatId?: string | null;
  status: string;
  summary?: string | null;
  notes?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  productInterest?: string | null;
  quantity?: string | null;
  estimatedBudget?: string | null;
  expectedDelivery?: string | null;
  dealStage?: string;
  nextFollowUpAt?: string | null;
  assignedTo?: string | null;
  leadSource?: string | null;
  quoteAmount?: string | null;
  orderAmount?: string | null;
  firstContact: string;
  lastContact: string;
  tags: TagOnCustomer[];
  inquiries: Inquiry[];
  messages?: Message[];
  enrichments?: Enrichment[];
  activities?: CustomerActivity[];
  drafts?: ReplyDraft[];
  _count?: { messages: number; drafts: number };
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
