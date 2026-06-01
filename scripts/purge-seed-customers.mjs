/**
 * 删除 seed / 模板示例假客户（保留真实 WhatsApp 导入数据）
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_PHONES = ["+966500000001", "+447700900123"];
const SEED_NAMES = ["Khalid Al-Saud", "James Carter"];

async function main() {
  const toDelete = await prisma.customer.findMany({
    where: {
      OR: [
        { phone: { in: SEED_PHONES } },
        { rawPhone: { in: SEED_PHONES } },
        { name: { in: SEED_NAMES } },
        { waChatId: { in: SEED_NAMES } },
      ],
    },
    select: { id: true, name: true, phone: true },
  });

  if (toDelete.length === 0) {
    console.log("未发现 seed 假客户，无需删除。");
    return;
  }

  for (const c of toDelete) {
    await prisma.customer.delete({ where: { id: c.id } });
    console.log(`已删除: ${c.name ?? c.phone ?? c.id}`);
  }
  console.log(`共删除 ${toDelete.length} 位假客户。`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
