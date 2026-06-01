import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { parseAssetIds, parseAttachments, type AttachmentMeta } from "./attachments";

export { parseAssetIds, parseAttachments, type AttachmentMeta };

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

/** 本地开发：写入 public/uploads；Vercel 生产：使用 Blob（需 BLOB_READ_WRITE_TOKEN） */
export async function saveUploadedFile(
  file: File,
  category: string
): Promise<{ fileName: string; fileUrl: string; mimeType: string; fileSize: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${randomUUID()}.${ext}`;
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileSize = buffer.length;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`assets/${category}/${safeName}`, buffer, {
      access: "public",
      contentType: mimeType,
    });
    return { fileName: file.name, fileUrl: blob.url, mimeType, fileSize };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const diskPath = join(UPLOAD_DIR, safeName);
  await writeFile(diskPath, buffer);
  return {
    fileName: file.name,
    fileUrl: `/uploads/${safeName}`,
    mimeType,
    fileSize,
  };
}
