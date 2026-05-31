const API = "http://localhost:3000/api/ingest";

const AUTO_REPLY =
  "Thank you for your message. We're unavailable right now, but will respond as soon as possible.";

const customers = [
  {
    customer: {
      phone: "+18323605960",
      waChatId: "+1 (832) 360-5960",
      language: "en",
      summary: "美国客户（德州），咨询玻璃门型号、型材及组装细节，可能已发文件。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText:
          "Can you send me more details on the glass door models and the profiles and assembly of these",
        originalLang: "en",
        translatedZh: "能否发更多玻璃门型号、型材及组装的详细资料？",
      },
    ],
    inquiries: [{ type: "other", note: "玻璃门型号/型材/组装咨询" }],
    tags: ["美国", "高意向"],
    draft: {
      draftZh:
        "您好！感谢联系 Gainer。我马上发玻璃门各型号的型材截面图和组装说明，请问项目是商用还是住宅？大概多少樘？",
      draftTarget:
        "Hello! Thanks for contacting Gainer. I'll send you profile sections and assembly details for our glass door models shortly. Is this for commercial or residential, and how many units do you need?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+60163058289",
      waChatId: "+60 16-305 8289",
      language: "en",
      summary: "马来西亚客户，通过 Facebook 广告咨询，想了解产品详情。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText: "Hello! Can I get more info on this?",
        originalLang: "en",
        translatedZh: "你好！可以了解更多相关信息吗？",
      },
    ],
    inquiries: [{ type: "other", note: "Facebook广告咨询" }],
    tags: ["马来西亚", "Facebook来源"],
    draft: {
      draftZh: "您好！感谢联系 Gainer。请问您想了解哪款产品？我发详细资料和画册给您。",
      draftTarget:
        "Hello! Thanks for reaching out to Gainer. Which product are you interested in? I'll send you details and our catalog.",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+5215548001630",
      waChatId: "+52 1 55 4800 1630",
      language: "en",
      summary: "墨西哥客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "WhatsApp Web 同步暂停，需打开手机查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["墨西哥"],
  },
  {
    customer: {
      phone: "+60183256415",
      waChatId: "+60 18-325 6415",
      language: "en",
      summary: "马来西亚客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["马来西亚"],
  },
  {
    customer: {
      phone: "+6590727161",
      waChatId: "+65 9072 7161",
      language: "zh",
      summary: "新加坡号码，内部跟进消息「我去了解一下」（可能是销售/跟单同事）。",
      status: "following",
      notes: "疑似内部人员，非客户咨询",
    },
    messages: [
      {
        direction: "in",
        originalText: "我去了解一下",
        originalLang: "zh",
        translatedZh: "我去了解一下",
      },
    ],
    inquiries: [{ type: "other", note: "内部跟进" }],
    tags: ["新加坡", "内部/跟单"],
  },
  {
    customer: {
      phone: "+60127583077",
      waChatId: "+60 12-758 3077",
      language: "en",
      summary: "马来西亚客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["马来西亚"],
  },
  {
    customer: {
      phone: "+66966492893",
      waChatId: "+66 96 649 2893",
      language: "en",
      summary: "泰国客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["泰国"],
  },
  {
    customer: {
      phone: "+9595174605",
      waChatId: "+95 9 517 4605",
      language: "en",
      summary: "缅甸客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["缅甸"],
  },
  {
    customer: {
      phone: "+966578505870",
      waChatId: "+966 57 850 5870",
      language: "en",
      summary: "沙特客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["沙特阿拉伯"],
  },
  {
    customer: {
      phone: "+966567090857",
      waChatId: "+966 56 709 0857",
      language: "en",
      summary: "沙特客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["沙特阿拉伯"],
  },
  {
    customer: {
      phone: "+971505992644",
      waChatId: "+971 50 599 2644",
      language: "en",
      summary: "阿联酋客户，有新未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["阿联酋"],
  },
  {
    customer: {
      phone: "+60127347234",
      waChatId: "+60 12-734 7234",
      language: "en",
      summary: "马来西亚客户，3条未读（预览为自动回复，完整消息需手机同步）。",
      status: "new",
      notes: "需手机同步查看客户原始消息",
    },
    messages: [
      {
        direction: "out",
        originalText: AUTO_REPLY,
        originalLang: "en",
        translatedZh: "感谢您的消息。我们目前不在线，会尽快回复。",
      },
    ],
    inquiries: [{ type: "other", note: "待同步完整消息" }],
    tags: ["马来西亚"],
  },
  {
    customer: {
      phone: "+66959502635",
      waChatId: "+66 95 950 2635",
      language: "en",
      summary:
        "泰国号码发来 Gainer 工厂介绍/catalog 信息，疑似供应商/同行推广或误发，待核实。",
      status: "new",
      notes: "待人工确认是否为有效客户",
    },
    messages: [
      {
        direction: "in",
        originalText:
          "pls kindly review our catalogue,our factory named Gainer located in Foshan,Guangdong provinve,china.we are a factory with over 25 years experience for aluminum products,we provide OEM/ODM service for many furniture brands in domestic and overseas market.",
        originalLang: "en",
        translatedZh:
          "请查阅我们的目录。我们工厂名叫 Gainer，位于中国广东佛山，做铝制品超过25年，为国内外家具品牌提供 OEM/ODM 服务。",
      },
    ],
    inquiries: [{ type: "other", note: "疑似推广/同行，待核实" }],
    tags: ["泰国", "待核实"],
  },
];

let ok = 0;
for (const payload of customers) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.ok) {
    ok++;
    console.log(`✓ ${payload.customer.waChatId}`);
  } else {
    console.log(`✗ ${payload.customer.waChatId}: ${json.error}`);
  }
}
console.log(`\nDone: ${ok}/${customers.length} remaining customers ingested.`);
