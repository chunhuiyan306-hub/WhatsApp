const API = "http://localhost:3000/api/ingest";

const customers = [
  {
    customer: {
      phone: "+971509464300",
      waChatId: "+971 50 946 4300",
      language: "en",
      summary: "阿联酋客户（Instagram广告来源），主动索要产品画册以便选型。",
      status: "new",
    },
    messages: [
      {
        direction: "out",
        originalText: "Hi! I am Ryan from Gainer. What can I Help for you?",
        originalLang: "en",
        translatedZh: "你好！我是 Gainer 的 Ryan，有什么可以帮您？",
      },
      {
        direction: "in",
        originalText:
          "Good morning, kindly send catalog of your product in order to choose from.\n\nRegards",
        originalLang: "en",
        translatedZh:
          "早上好，请发送你们的产品目录以便我们选择。\n\n此致敬礼",
      },
    ],
    inquiries: [{ type: "catalog", note: "索要产品画册" }],
    tags: ["高意向", "阿联酋", "Instagram来源"],
    draft: {
      draftZh:
        "您好！感谢联系 Gainer。产品画册马上发给您，请问您主要关注哪类产品？项目大概数量和交期是？",
      draftTarget:
        "Good morning! Thank you for reaching out to Gainer. I'll send you our product catalog shortly. May I know which product range you're interested in, and the estimated quantity & delivery timeline?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+966548025712",
      waChatId: "+966 54 802 5712",
      language: "en",
      summary: "沙特客户，询问最新产品目录和报价。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText: "Can I get your latest catalog and pricing?",
        originalLang: "en",
        translatedZh: "可以给我最新的产品目录和报价吗？",
      },
    ],
    inquiries: [
      { type: "catalog", note: "要目录" },
      { type: "quote", note: "要报价" },
    ],
    tags: ["沙特阿拉伯", "高意向"],
    draft: {
      draftZh:
        "您好！最新产品目录和报价单我马上发您。请问项目类型和数量大概是多少？",
      draftTarget:
        "Hello! I'll send you our latest catalog and pricing shortly. Could you share your project type and estimated quantity?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+966566718163",
      waChatId: "+966 56 671 8163",
      language: "ar",
      summary:
        "沙特客户，有铝制凉亭、CNC铝立面装饰项目需求，属于带项目咨询。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText:
          "عندي برجولا الومنيوم  وديكور واجهة الومنيوم cnc",
        originalLang: "ar",
        translatedZh: "我有铝制凉亭，以及 CNC 铝制立面装饰需求。",
      },
    ],
    inquiries: [{ type: "project", note: "铝凉亭 + CNC铝立面装饰" }],
    tags: ["沙特阿拉伯", "带项目"],
    draft: {
      draftZh:
        "您好！感谢联系。我们有铝制凉亭和 CNC 立面装饰相关产品，能否发一下项目图纸或现场照片、大概面积和数量？",
      draftTarget:
        "مرحبًا! لدينا منتجات البرجolas الألومنيوم وديكور الواجهات CNC. هل يمكنك إرسال مخططات المشروع أو صور الموقع والمساحة والكمية التقريبية؟",
      targetLang: "ar",
    },
  },
  {
    customer: {
      phone: "+966592520203",
      waChatId: "+966 59 252 0203",
      language: "en",
      summary: "沙特客户，询问最新目录和报价。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText: "Can I get your latest catalog and pricing?",
        originalLang: "en",
        translatedZh: "可以给我最新的产品目录和报价吗？",
      },
    ],
    inquiries: [
      { type: "catalog" },
      { type: "quote" },
    ],
    tags: ["沙特阿拉伯"],
    draft: {
      draftZh: "您好！目录和报价马上发您，请问项目数量和交期？",
      draftTarget:
        "Hello! I'll send the catalog and pricing shortly. May I know the quantity and delivery timeline?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+966549899903",
      waChatId: "+966 54 989 9903",
      language: "en",
      summary: "沙特客户，询问最新目录和报价。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText: "Can I get your latest catalog and pricing?",
        originalLang: "en",
        translatedZh: "可以给我最新的产品目录和报价吗？",
      },
    ],
    inquiries: [{ type: "catalog" }, { type: "quote" }],
    tags: ["沙特阿拉伯"],
    draft: {
      draftZh: "您好！目录和报价马上发您，请问需要什么产品？",
      draftTarget:
        "Hello! I'll send our latest catalog and pricing. Which products are you interested in?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+60146434208",
      waChatId: "+60 14-643 4208",
      language: "en",
      summary: "马来西亚客户，通过广告咨询，想了解产品更多信息。",
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
    inquiries: [{ type: "other", note: "广告咨询，要了解详情" }],
    tags: ["马来西亚"],
    draft: {
      draftZh:
        "您好！感谢联系 Gainer。请问您想了解哪款产品？是用于什么项目？我可以发详细资料和画册给您。",
      draftTarget:
        "Hello! Thanks for contacting Gainer. Which product are you interested in, and what project is it for? I can send you detailed info and our catalog.",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+601120979263",
      waChatId: "+60 11-2097 9263",
      language: "en",
      summary: "马来西亚客户，广告咨询，想了解产品详情。",
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
    inquiries: [{ type: "other", note: "广告咨询" }],
    tags: ["马来西亚"],
    draft: {
      draftZh: "您好！请问您关注哪款产品？我发详细资料和画册给您。",
      draftTarget:
        "Hello! Which product are you interested in? I'll send you details and our catalog.",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+601175735010",
      waChatId: "+60 11-7573 5010",
      language: "en",
      summary: "马来西亚客户，广告咨询，想了解详情。",
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
    inquiries: [{ type: "other", note: "广告咨询" }],
    tags: ["马来西亚"],
    draft: {
      draftZh: "您好！请问您想了解哪款产品？用途和数量大概是？",
      draftTarget:
        "Hello! Which product would you like to know more about? What's the application and estimated quantity?",
      targetLang: "en",
    },
  },
  {
    customer: {
      phone: "+60146868141",
      waChatId: "+60 14-686 8141",
      language: "zh",
      summary: "马来西亚客户（中文沟通），询问是否可以定制。",
      status: "new",
    },
    messages: [
      {
        direction: "in",
        originalText: "可以定制？",
        originalLang: "zh",
        translatedZh: "可以定制吗？",
      },
    ],
    inquiries: [{ type: "other", note: "询问定制" }],
    tags: ["马来西亚", "中文客户"],
    draft: {
      draftZh:
        "您好！我们可以定制。请问您需要什么产品、尺寸规格和数量？有图纸或参考图片吗？",
      draftTarget:
        "您好！我们可以定制。请问您需要什么产品、尺寸规格和数量？有图纸或参考图片吗？",
      targetLang: "zh",
    },
  },
  {
    customer: {
      phone: "+6598508258",
      waChatId: "+65 9850 8258",
      language: "en",
      summary: "新加坡客户，广告咨询，想了解产品详情。",
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
    inquiries: [{ type: "other", note: "广告咨询" }],
    tags: ["新加坡"],
    draft: {
      draftZh: "您好！请问您想了解哪款产品？我发详细资料给您。",
      draftTarget:
        "Hello! Which product would you like more info on? I'll send you the details.",
      targetLang: "en",
    },
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
  const phone = payload.customer.phone;
  if (json.ok) {
    ok++;
    console.log(`✓ ${phone} (${json.data?.addedMessages ?? 0} msgs)`);
  } else {
    console.log(`✗ ${phone}: ${json.error}`);
  }
}
console.log(`\nDone: ${ok}/${customers.length} customers ingested.`);
