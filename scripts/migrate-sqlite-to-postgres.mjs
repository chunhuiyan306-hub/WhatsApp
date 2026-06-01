/**
 * 一次性：SQLite dev.db → Postgres (DATABASE_URL)
 */
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");
const SQLITE_PATH = join(ROOT, "prisma", "dev.db");

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  console.error("请设置 DATABASE_URL 为 Postgres 连接串");
  process.exit(1);
}
if (!existsSync(SQLITE_PATH)) {
  console.error("未找到 prisma/dev.db，无需迁移");
  process.exit(0);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

function rows(table) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all();
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bool(v) {
  return v === 1 || v === true || v === "1";
}

async function main() {
  console.log("[migrate] SQLite → Postgres");
  const counts = {};

  for (const t of rows("Tag")) {
    await prisma.tag.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        name: t.name,
        color: t.color,
        createdAt: parseDate(t.createdAt) ?? new Date(),
      },
    });
  }
  counts.Tag = rows("Tag").length;

  for (const c of rows("Customer")) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        ...c,
        nextFollowUpAt: parseDate(c.nextFollowUpAt),
        firstContact: parseDate(c.firstContact) ?? new Date(),
        lastContact: parseDate(c.lastContact) ?? new Date(),
        createdAt: parseDate(c.createdAt) ?? new Date(),
        updatedAt: parseDate(c.updatedAt) ?? new Date(),
      },
    });
  }
  counts.Customer = rows("Customer").length;

  for (const m of rows("Message")) {
    await prisma.message.upsert({
      where: { id: m.id },
      update: {},
      create: {
        ...m,
        timestamp: parseDate(m.timestamp) ?? new Date(),
        createdAt: parseDate(m.createdAt) ?? new Date(),
      },
    });
  }
  counts.Message = rows("Message").length;

  for (const r of rows("Inquiry")) {
    await prisma.inquiry.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    });
  }
  counts.Inquiry = rows("Inquiry").length;

  for (const r of rows("TagOnCustomer")) {
    await prisma.tagOnCustomer.upsert({
      where: { customerId_tagId: { customerId: r.customerId, tagId: r.tagId } },
      update: {},
      create: {
        ...r,
        syncedToWa: bool(r.syncedToWa),
        assignedAt: parseDate(r.assignedAt) ?? new Date(),
      },
    });
  }
  counts.TagOnCustomer = rows("TagOnCustomer").length;

  for (const r of rows("Enrichment")) {
    await prisma.enrichment.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        verified: bool(r.verified),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    });
  }
  counts.Enrichment = rows("Enrichment").length;

  for (const r of rows("ReplyDraft")) {
    await prisma.replyDraft.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        sentAt: parseDate(r.sentAt),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    });
  }
  counts.ReplyDraft = rows("ReplyDraft").length;

  for (const r of rows("ReplyTemplate")) {
    await prisma.replyTemplate.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        isDefault: bool(r.isDefault),
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    });
  }
  counts.ReplyTemplate = rows("ReplyTemplate").length;

  for (const r of rows("MediaAsset")) {
    await prisma.mediaAsset.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        createdAt: parseDate(r.createdAt) ?? new Date(),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    });
  }
  counts.MediaAsset = rows("MediaAsset").length;

  for (const r of rows("AutomationState")) {
    await prisma.automationState.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        enabled: bool(r.enabled),
        lastScanAt: parseDate(r.lastScanAt),
        updatedAt: parseDate(r.updatedAt) ?? new Date(),
      },
    });
  }
  counts.AutomationState = rows("AutomationState").length;

  for (const r of rows("AutomationLog")) {
    await prisma.automationLog.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    });
  }
  counts.AutomationLog = rows("AutomationLog").length;

  for (const r of rows("CustomerActivity")) {
    await prisma.customerActivity.upsert({
      where: { id: r.id },
      update: {},
      create: {
        ...r,
        createdAt: parseDate(r.createdAt) ?? new Date(),
      },
    });
  }
  counts.CustomerActivity = rows("CustomerActivity").length;

  console.log("[migrate] 完成:", counts);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
