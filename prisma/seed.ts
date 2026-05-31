import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("写入示例数据…");

  // 示例 1：沙特客户（阿拉伯语，要画册）
  const c1 = await prisma.customer.create({
    data: {
      name: "Khalid Al-Saud",
      rawPhone: "+966500000001",
      phone: "+966500000001",
      country: "沙特阿拉伯",
      countryCode: "SA",
      callingCode: "966",
      language: "ar",
      waChatId: "Khalid Al-Saud",
      status: "new",
      summary: "沙特建材采购商，想先看产品画册，意向较高。",
      messages: {
        create: [
          {
            direction: "in",
            originalText: "مرحبا، هل يمكنكم إرسال الكتالوج؟",
            originalLang: "ar",
            translatedZh: "你好，可以发一下产品画册吗？",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
          },
          {
            direction: "in",
            originalText: "نحتاج المنتجات للمشروع في الرياض",
            originalLang: "ar",
            translatedZh: "我们利雅得的项目需要这些产品。",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          },
        ],
      },
      inquiries: {
        create: [
          { type: "catalog", note: "要产品画册" },
          { type: "project", note: "利雅得项目" },
        ],
      },
      enrichments: {
        create: {
          company: "Al-Saud Trading Co.",
          role: "采购经理",
          source: "电话号码归属沙特；公司信息为示例待核实",
          confidence: "low",
          verified: false,
        },
      },
      drafts: {
        create: {
          draftZh: "您好，画册马上发给您。请问项目大概的数量和交付时间是？",
          draftTarget:
            "مرحبًا، سنرسل لك الكتالوج حالًا. كم الكمية المطلوبة وموعد التسليم للمشروع؟",
          targetLang: "ar",
          status: "pending",
        },
      },
    },
  });

  const tagAr = await prisma.tag.create({
    data: { name: "阿拉伯客户", color: "#f59e0b" },
  });
  const tagHot = await prisma.tag.create({
    data: { name: "高意向", color: "#ef4444" },
  });
  await prisma.tagOnCustomer.createMany({
    data: [
      { customerId: c1.id, tagId: tagAr.id, syncedToWa: false },
      { customerId: c1.id, tagId: tagHot.id, syncedToWa: false },
    ],
  });

  // 示例 2：英国客户（英语，带项目）
  await prisma.customer.create({
    data: {
      name: "James Carter",
      rawPhone: "+447700900123",
      phone: "+447700900123",
      country: "英国",
      countryCode: "GB",
      callingCode: "44",
      language: "en",
      waChatId: "James Carter",
      status: "following",
      summary: "英国工程承包商，手上有现成项目，询价中。",
      messages: {
        create: [
          {
            direction: "in",
            originalText: "Hi, do you supply for large commercial projects?",
            originalLang: "en",
            translatedZh: "你好，你们能为大型商业项目供货吗？",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
          },
          {
            direction: "out",
            originalText: "Yes we do. Could you share the spec and quantity?",
            originalLang: "en",
            translatedZh: "可以的。能发一下规格和数量吗？",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25),
          },
        ],
      },
      inquiries: { create: { type: "project", note: "大型商业项目" } },
    },
  });

  console.log("写入默认话术模板…");
  await prisma.replyTemplate.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "要画册-英文标准",
        inquiryType: "catalog",
        targetLang: "en",
        isDefault: true,
        draftTarget:
          "Hello! Thank you for contacting Gainer. Please find our latest product catalog attached. May I know your project type and approximate quantity?",
        draftZh:
          "您好！感谢联系 Gainer。已附上最新产品画册。请问项目是商用还是住宅？大概数量多少？",
      },
      {
        name: "要画册-阿拉伯语",
        inquiryType: "catalog",
        targetLang: "ar",
        isDefault: true,
        draftTarget:
          "مرحبًا! شكرًا لتواصلك مع Gainer. مرفق كتalog المنتجات. ما نوع المشروع والكمية التقريبية؟",
        draftZh: "您好！感谢联系。已附产品画册，请问项目类型和数量？",
      },
      {
        name: "询价-英文标准",
        inquiryType: "quote",
        targetLang: "en",
        isDefault: true,
        draftTarget:
          "Hello! Thanks for your inquiry. I'll prepare a quotation shortly. Could you share product model, dimensions, and quantity?",
        draftZh: "您好！感谢询价。我会准备报价，请提供型号、尺寸和数量。",
      },
      {
        name: "带项目-英文标准",
        inquiryType: "project",
        targetLang: "en",
        isDefault: true,
        draftTarget:
          "Hello! Thank you for sharing your project. Our team will review and send profiles and proposal. Could you share project location and timeline?",
        draftZh: "您好！感谢分享项目。我们会评估后发型材图和方案，请问项目地点和工期？",
      },
    ],
  });

  console.log("完成。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
