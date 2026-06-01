import type { InquiryType } from "./classify";

export interface StageInferenceInput {
  messages: Array<{ direction: string; originalText?: string }>;
  inquiries: Array<{ type: InquiryType; note?: string }>;
  highIntent: boolean;
  skipReason?: string;
}

export interface StageInferenceResult {
  status: string;
  dealStage: string;
  reason: string;
}

const WON_MARKERS =
  /paid|payment received|payment done|order confirmed|已付款|已下单|deposit received|po number|purchase order|成交|汇款|已付定金/i;
const SAMPLE_MARKERS =
  /sample|样品|mock.?up|swatch|色板|send sample|ship sample|free sample/i;
const QUOTE_MARKERS =
  /quotation|quote attached|price list|pricing|pi\b|proforma|commercial invoice|报价单|报价表|fob|cif|unit price/i;
const CATALOG_SENT =
  /catalog|brochure|画册|attached|attachment|pdf|请查收|please find|sent you/i;
const LOST_MARKERS =
  /not interested|too expensive|found another|no longer|maybe later|暂不需要|太贵|不考虑了|already bought|went with/i;
const NEGOTIATE_MARKERS =
  /negotiat|discount|better price|lead time|delivery time|交期|能否优惠|再便宜|terms|payment terms/i;

/** 根据最近 10 条对话推断 status + dealStage */
export function inferCustomerStage(
  input: StageInferenceInput
): StageInferenceResult {
  const recent = input.messages.slice(-10);
  const { inquiries, skipReason } = input;

  const allText = recent.map((m) => m.originalText ?? "").join("\n");
  const inMsgs = recent.filter((m) => m.direction !== "out");
  const outMsgs = recent.filter((m) => m.direction === "out");
  const inCount = inMsgs.length;
  const outCount = outMsgs.length;
  const hasDialogue = inCount > 0 && outCount > 0;
  const last = recent[recent.length - 1];
  const lastIsIn = last && last.direction !== "out";

  if (skipReason === "competitor" || skipReason === "non_target_business") {
    return { status: "closed", dealStage: "lost", reason: skipReason };
  }
  if (skipReason === "internal") {
    return { status: "following", dealStage: "negotiating", reason: "internal" };
  }
  if (LOST_MARKERS.test(allText)) {
    return { status: "closed", dealStage: "lost", reason: "lost_keywords" };
  }
  if (WON_MARKERS.test(allText)) {
    return { status: "closed", dealStage: "won", reason: "won_keywords" };
  }
  if (SAMPLE_MARKERS.test(allText)) {
    return { status: "following", dealStage: "sample", reason: "sample" };
  }

  const hasQuoteInquiry = inquiries.some((i) => i.type === "quote");
  const hasProjectInquiry = inquiries.some((i) => i.type === "project");
  const hasCatalogInquiry = inquiries.some((i) => i.type === "catalog");
  const weSentQuote = outMsgs.some((m) => QUOTE_MARKERS.test(m.originalText ?? ""));
  const weSentCatalog = outMsgs.some((m) => CATALOG_SENT.test(m.originalText ?? ""));

  if (QUOTE_MARKERS.test(allText) || hasQuoteInquiry || weSentQuote) {
    if (NEGOTIATE_MARKERS.test(allText)) {
      return { status: "following", dealStage: "negotiating", reason: "quote_negotiate" };
    }
    return {
      status: "following",
      dealStage: "quoted",
      reason: weSentQuote ? "we_sent_quote" : "quote_inquiry",
    };
  }

  if (hasProjectInquiry && hasDialogue) {
    if (NEGOTIATE_MARKERS.test(allText)) {
      return { status: "following", dealStage: "negotiating", reason: "project_negotiate" };
    }
    return { status: "following", dealStage: "negotiating", reason: "project_dialogue" };
  }

  if (hasCatalogInquiry || weSentCatalog) {
    if (lastIsIn && hasDialogue) {
      return { status: "following", dealStage: "inquiry", reason: "catalog_await_reply" };
    }
    if (weSentCatalog && !lastIsIn) {
      return { status: "following", dealStage: "quoted", reason: "catalog_sent" };
    }
    return {
      status: inCount > 0 && outCount === 0 ? "new" : "following",
      dealStage: "inquiry",
      reason: "catalog",
    };
  }

  if (hasDialogue) {
    return {
      status: "following",
      dealStage: "inquiry",
      reason: lastIsIn ? "dialogue_await_us" : "dialogue_await_them",
    };
  }

  if (outCount > 0 && inCount === 0) {
    return { status: "contacted", dealStage: "inquiry", reason: "outbound_only" };
  }

  if (inCount > 0) {
    return { status: "new", dealStage: "inquiry", reason: "inbound_new" };
  }

  return { status: "new", dealStage: "inquiry", reason: "default" };
}
