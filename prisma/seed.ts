import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
