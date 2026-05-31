/**
 * 批量写入客户背景调查结果（LinkedIn / 公开资料 / WhatsApp 资料页）
 * 所有结果 verified=false，需在看板人工确认
 */
const API_ENRICH = "http://localhost:3000/api/enrichments";
const API_CUSTOMER = "http://localhost:3000/api/customers";

/** @type {Array<{ customerId: string; patch?: object; enrichment: object }>} */
const items = [
  // ── 阿联酋 · Instagram 广告 · 高意向 ──
  {
    customerId: "cmpttsrne0000xxg2s7wspump",
    patch: {
      name: "Lora Bergiy",
      summary:
        "迪拜 Lora Bergiy Design / Dubai Design Group 创始人，国际获奖室内设计与建筑事务所，从 Instagram 广告来索要产品画册选型。",
    },
    enrichment: {
      company: "Dubai Design Group by Lora Bergiy",
      role: "Founder & Creative Director",
      website: "https://www.design-lbd.com",
      linkedinUrl: "https://www.linkedin.com/company/dubai-design-group",
      source: "WhatsApp资料页(~Lora Bergiy) + 公开企业名录 + 官网",
      confidence: "medium",
      verified: false,
      note:
        "WhatsApp 昵称 ~Lora Bergiy；Sidra Tower 18F Office 1807, Sheikh Zayed Rd, Dubai；1996年起运营，做皇室/别墅/商业项目；Instagram @dubai.design；公司固话 +971-4-3741845（与WhatsApp手机不同）。",
    },
  },

  // ── 美国 · 德州 · 玻璃门咨询 ──
  {
    customerId: "cmptuwvph002lxxg28q7lforp",
    patch: {
      name: "Taikhoom",
      summary:
        "美国德州（832区号休斯顿），WhatsApp昵称 Taikhoom；深度咨询玻璃门型号/型材/组装，曾索要 showroom 视频与材料样品，高意向。",
    },
    enrichment: {
      company: "BGE, Inc.（待核实）",
      role: "Land/Site Engineer I（LinkedIn候选）",
      linkedinUrl: "https://www.linkedin.com/in/taikhoom-younus",
      website: "https://www.bgeinc.com",
      source: "WhatsApp资料页(~Taikhoom) + LinkedIn公开检索",
      confidence: "low",
      verified: false,
      note:
        "LinkedIn 有德州 Pflugerville 的 Taikhoom Younus（BGE土木土地工程师），与铝材玻璃行业不完全吻合，可能同名不同人；832区号属休斯顿大都市圈，当地玻璃/门窗经销商较多（如 Your Door LLC、Fashion Glass 等）。建议首封回复顺带问公司名与项目类型。",
    },
  },

  // ── 马来西亚 · 中文 · 商业账号实为餐厅 ──
  {
    customerId: "cmpttssgj0024xxg2fwdjllu4",
    patch: {
      name: "1st Wok",
      summary:
        "马来西亚 WhatsApp 商业账号「1st Wok」餐厅，非铝材/装修行业；中文问「可以定制？」疑似误点广告，优先级低。",
      status: "following",
    },
    enrichment: {
      company: "1st Wok",
      role: "Restaurant（WhatsApp Business Account）",
      source: "WhatsApp商业资料页",
      confidence: "medium",
      verified: false,
      note: "WhatsApp 显示 Business Account，行业为餐饮；与 Gainer 铝材产品关联度极低，建议标记低优先级或归档。",
    },
  },

  // ── 沙特 · 带项目（凉亭+CNC立面） ──
  {
    customerId: "cmpttsrwr000nxxg2rzk6n7z2",
    enrichment: {
      company: "未公开（疑似沙特立面/装饰承包商）",
      role: "采购或项目经理（推断）",
      source: "消息关键词 + 沙特行业公开资料",
      confidence: "low",
      verified: false,
      note:
        "阿拉伯语咨询铝凉亭 + CNC铝立面装饰，符合沙特建筑立面市场（参考 Alusystems、AluFab、FATECO 等本地立面承包商业务）。WhatsApp 未存联系人姓名，LinkedIn 未能按号码直接匹配。建议回复时索要公司名与项目地点。",
    },
  },

  // ── 沙特 · 要目录+报价（多条类似线索） ──
  {
    customerId: "cmpttsrsu000cxxg25jdmetpu",
    enrichment: {
      company: "未公开",
      role: "采购/询价（推断）",
      source: "消息内容 + 沙特铝门窗市场背景",
      confidence: "low",
      verified: false,
      note: "索要最新目录和报价，沙特 +966 54 号段；当地常见买家类型：立面分包商、建材贸易商、装修公司采购。无 LinkedIn/官网直接匹配。",
    },
  },
  {
    customerId: "cmpttss0d000wxxg2rvfmmt0h",
    enrichment: {
      company: "未公开",
      role: "采购/询价（推断）",
      source: "消息内容",
      confidence: "low",
      verified: false,
      note: "英文索要 catalog and pricing；+966 59 号段，沙特本地号码。",
    },
  },
  {
    customerId: "cmpttss3u0016xxg2aktkoyws",
    enrichment: {
      company: "未公开",
      role: "采购/询价（推断）",
      source: "消息内容",
      confidence: "low",
      verified: false,
      note: "与 +966592520203 类似话术（catalog + pricing），可能为同一渠道来的独立买家。",
    },
  },
  {
    customerId: "cmptuwwgk004axxg26zhgbyx1",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览（仅见自动回复）",
      confidence: "low",
      verified: false,
      note: "+966 56 709 0857；Web端未同步到客户原始消息，需手机打开 WhatsApp 同步后再查资料页姓名。",
    },
  },
  {
    customerId: "cmptuwwdy0044xxg26g5fq2ct",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览（仅见自动回复）",
      confidence: "low",
      verified: false,
      note: "+966 57 850 5870；待手机同步完整消息后补充 LinkedIn 检索关键词。",
    },
  },

  // ── 阿联酋 · 第二条线索 ──
  {
    customerId: "cmptuwwj2004gxxg2jx7nrlbx",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+971 50 599 2644；迪拜/阿联酋本地号，Web 端仅见自动回复预览，待同步。阿联酋铝玻璃承包商密度高（Alutal、Ahmad Aluminium 等）。",
    },
  },

  // ── 马来西亚 · Facebook 广告线索（批量） ──
  {
    customerId: "cmpttss7d001gxxg206uignq8",
    enrichment: {
      company: "未公开",
      role: "终端客户或小型装修（推断）",
      source: "Facebook广告标准话术 + 马来西亚市场",
      confidence: "low",
      verified: false,
      note: "「Hello! Can I get more info on this?」为 Meta 广告默认咨询语；+60 14 号段（Maxis/Celcom）；未存 WA 姓名，LinkedIn 无号码匹配。",
    },
  },
  {
    customerId: "cmpttssam001oxxg2vkolv8nn",
    enrichment: {
      company: "未公开",
      role: "终端客户或小型装修（推断）",
      source: "Facebook广告标准话术",
      confidence: "low",
      verified: false,
      note: "+60 11 号段；广告引流通用咨询，需追问项目类型与数量判断 B2B/B2C。",
    },
  },
  {
    customerId: "cmpttssdm001wxxg2dekeachz",
    enrichment: {
      company: "未公开",
      role: "终端客户或小型装修（推断）",
      source: "Facebook广告标准话术",
      confidence: "low",
      verified: false,
      note: "+60 11-7573 5010；马来西亚 FB 广告线索，无公开 LinkedIn 匹配。",
    },
  },
  {
    customerId: "cmptuwvtg002uxxg2zqkhuucp",
    enrichment: {
      company: "未公开",
      role: "终端客户或小型装修（推断）",
      source: "Facebook广告",
      confidence: "low",
      verified: false,
      note: "+60 16-305 8289；Facebook 广告来源，标准咨询语。",
    },
  },
  {
    customerId: "cmptuwwlh004mxxg29t6hktdg",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读（3条，Web未同步）",
      confidence: "low",
      verified: false,
      note: "+60 12-734 7234；3条未读但 Web 仅见自动回复，需手机同步。",
    },
  },
  {
    customerId: "cmptuwvzy0039xxg27oahhttr",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+60 18-325 6415；待同步原始消息后再做 LinkedIn 姓名检索。",
    },
  },
  {
    customerId: "cmptuww5n003mxxg21jovsv8o",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+60 12-758 3077；马来西亚号码，Web 端消息未同步。",
    },
  },

  // ── 新加坡 · 广告咨询 ──
  {
    customerId: "cmpttssk4002dxxg2en05t3uq",
    enrichment: {
      company: "未公开",
      role: "终端客户或设计师（推断）",
      source: "广告咨询话术 + 新加坡市场",
      confidence: "low",
      verified: false,
      note: "+65 9850 8258；新加坡高消费 residential/commercial 翻新市场，广告引流咨询，无 LinkedIn 直接匹配。",
    },
  },

  // ── 新加坡 · 内部跟单 ──
  {
    customerId: "cmptuww2d003fxxg2i5ihoj3t",
    patch: { status: "following", notes: "内部同事/跟单，非客户" },
    enrichment: {
      company: "内部",
      role: "销售/跟单同事",
      source: "聊天内容「我去了解一下」",
      confidence: "medium",
      verified: false,
      note: "+65 9072 7161；中文跟进语，疑似公司内部人员而非海外客户。",
    },
  },

  // ── 泰国 ──
  {
    customerId: "cmptuww8a003sxxg2kb2v6005",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+66 96 649 2893；泰国号码，Web 未同步客户消息。",
    },
  },
  {
    customerId: "cmptuwwo1004sxxg2uq30i42s",
    patch: {
      status: "following",
      summary:
        "泰国号码主动发来 Gainer/Flexing living 工厂 catalog 推广，疑似同行或供应商，非采购客户。",
    },
    enrichment: {
      company: "Gainer / Flexing living（佛山铝材工厂，对方自称）",
      role: "工厂销售/推广（推断）",
      source: "消息内容（对方自述工厂信息）",
      confidence: "medium",
      verified: false,
      note:
        "消息自称 Foshan Gainer 铝制品工厂 + Flexing living 品牌 showroom；与你们同业，极可能是供应商开发或误发，建议核实后归档。",
    },
  },

  // ── 缅甸 / 墨西哥 ──
  {
    customerId: "cmptuwwb4003yxxg2m3gjluiu",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+95 9 517 4605；缅甸号码，Web 未同步；缅甸铝门窗市场以进口为主，待看原始消息。",
    },
  },
  {
    customerId: "cmptuwvx20033xxg2wkrxdelo",
    enrichment: {
      company: "未公开",
      role: "未知",
      source: "WhatsApp未读预览",
      confidence: "low",
      verified: false,
      note: "+52 1 55 4800 1630；墨西哥城（55）号码，Web 未同步客户原始消息。",
    },
  },

  // ── 示例种子客户（补充真实检索说明） ──
  {
    customerId: "cmptsospm0000ezyumzpl6d23",
    enrichment: {
      company: "Al-Saud Trading（示例数据）",
      role: "采购经理",
      linkedinUrl: "https://www.linkedin.com/in/...",
      source: "seed 示例",
      confidence: "low",
      verified: false,
      note: "演示用种子客户，非真实 WhatsApp 扫描结果。",
    },
  },
  {
    customerId: "cmptsosr60009ezyu180d516p",
    enrichment: {
      company: "未公开（示例：英国工程承包商）",
      role: "Engineering Contractor",
      source: "seed 示例 + 英国建筑市场背景",
      confidence: "low",
      verified: false,
      note: "演示用种子客户 James Carter；真实扫描中无 LinkedIn 直接匹配。",
    },
  },
];

async function patchCustomer(id, data) {
  const res = await fetch(`${API_CUSTOMER}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`PATCH customer ${id}: ${JSON.stringify(json)}`);
  return json.data;
}

async function postEnrichment(data) {
  const res = await fetch(API_ENRICH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`POST enrichment: ${JSON.stringify(json)}`);
  return json.data;
}

let ok = 0;
let fail = 0;
for (const item of items) {
  try {
    if (item.patch) await patchCustomer(item.customerId, item.patch);
    await postEnrichment({ customerId: item.customerId, ...item.enrichment });
    ok++;
    console.log(`✓ ${item.customerId.slice(-6)} … ${item.enrichment.company || item.enrichment.note?.slice(0, 30)}`);
  } catch (e) {
    fail++;
    console.error(`✗ ${item.customerId}:`, e.message);
  }
}
console.log(`\nDone: ${ok} ok, ${fail} failed, ${items.length} total`);
