/** 已知 WhatsApp 昵称 / 企业公开资料（自动匹配，verified=false） */
const KNOWN_PROFILES: Array<{
  match: (name: string, phone?: string | null) => boolean;
  company: string;
  role?: string;
  website?: string;
  linkedinUrl?: string;
  confidence: string;
  note: string;
}> = [
  {
    match: (n) => /lora bergiy/i.test(n),
    company: "Dubai Design Group by Lora Bergiy",
    role: "Founder & Creative Director",
    website: "https://www.design-lbd.com",
    linkedinUrl: "https://www.linkedin.com/company/dubai-design-group",
    confidence: "medium",
    note: "迪拜国际获奖室内设计/建筑事务所；Instagram 广告来源；Sidra Tower, Sheikh Zayed Rd。",
  },
  {
    match: (n) => /taikhoom/i.test(n),
    company: "BGE, Inc.（待核实）",
    role: "Land/Site Engineer I（LinkedIn 候选）",
    linkedinUrl: "https://www.linkedin.com/in/taikhoom-younus",
    website: "https://www.bgeinc.com",
    confidence: "low",
    note: "832 休斯顿区号；LinkedIn 有同名土木工程师，亦可能是门窗买家，需回复时确认公司。",
  },
  {
    match: (n) => /1st wok/i.test(n),
    company: "1st Wok",
    role: "Restaurant（WhatsApp Business）",
    confidence: "medium",
    note: "WhatsApp 商业账号为餐厅，非铝材目标客户。",
  },
];

export interface EnrichmentResult {
  company?: string;
  role?: string;
  website?: string;
  linkedinUrl?: string;
  source: string;
  confidence: string;
  note: string;
}

export function buildAutoEnrichment(input: {
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  countryCode?: string | null;
  isBusinessAccount?: boolean;
  businessName?: string | null;
  messageText?: string;
}): EnrichmentResult {
  const displayName = input.businessName || input.name || "";

  for (const p of KNOWN_PROFILES) {
    if (p.match(displayName, input.phone)) {
      return {
        company: p.company,
        role: p.role,
        website: p.website,
        linkedinUrl: p.linkedinUrl,
        source: "auto-pipeline · 已知资料库",
        confidence: p.confidence,
        note: p.note,
      };
    }
  }

  const msg = (input.messageText ?? "").toLowerCase();
  const cc = input.countryCode ?? "";
  const country = input.country ?? "未知";

  if (/gainer|flexing living|foshan.*aluminum/.test(msg)) {
    return {
      company: "Gainer / Flexing living（对方自称）",
      role: "工厂销售/推广",
      source: "auto-pipeline · 消息关键词",
      confidence: "medium",
      note: "消息含同业工厂自我介绍，疑似供应商或同行，非采购客户。",
    };
  }

  if (cc === "SA" || country.includes("沙特")) {
    if (/pergola|cnc|facade|立面|凉亭/.test(msg)) {
      return {
        company: "未公开（疑似沙特立面/装饰承包商）",
        role: "采购或项目经理（推断）",
        source: "auto-pipeline · 行业推断",
        confidence: "low",
        note: "咨询铝凉亭/CNC 立面，符合沙特建筑立面分包商特征；LinkedIn 未能按号码直接匹配。",
      };
    }
    if (/catalog|pricing|quote/.test(msg)) {
      return {
        company: "未公开",
        role: "采购/询价（推断）",
        source: "auto-pipeline · 沙特建材市场",
        confidence: "low",
        note: "索要目录/报价；沙特常见买家：立面分包、建材贸易、装修公司采购。",
      };
    }
  }

  if (cc === "AE" || country.includes("阿联酋")) {
    return {
      company: "未公开",
      role: "设计师/承包商/采购（推断）",
      source: "auto-pipeline · 阿联酋市场",
      confidence: "low",
      note: "阿联酋铝玻璃/室内设计市场活跃；若 WhatsApp 有昵称可二次检索 LinkedIn。",
    };
  }

  if (cc === "MY" || country.includes("马来西亚")) {
    if (/can i get more info|facebook/.test(msg)) {
      return {
        company: "未公开",
        role: "终端客户或小型装修（推断）",
        source: "auto-pipeline · FB 广告线索",
        confidence: "low",
        note: "Meta 广告标准咨询语；马来西亚 +60 号码，未存 WA 姓名。",
      };
    }
  }

  if (cc === "US" || country.includes("美国")) {
    if (/glass door|showroom|profile|assembly/.test(msg)) {
      return {
        company: "未公开（疑似德州门窗/玻璃买家）",
        role: "采购或项目经理（推断）",
        source: "auto-pipeline · 消息+区号",
        confidence: "low",
        note: "832 休斯顿区号；咨询玻璃门型材/展厅视频，可能是经销商或承包商。",
      };
    }
  }

  return {
    company: "未公开",
    role: "未知",
    source: "auto-pipeline · 默认",
    confidence: "low",
    note: `${country}号码；公开检索暂无直接 LinkedIn 匹配，待补充 WhatsApp 昵称或公司名后重跑。`,
  };
}
