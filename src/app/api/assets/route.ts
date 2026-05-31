import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { saveUploadedFile } from "@/lib/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const assets = await prisma.mediaAsset.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return ok(assets);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const name = (form.get("name") as string) || file?.name || "未命名";
  const category = (form.get("category") as string) || "catalog";

  if (!file?.size) return fail("请上传文件");

  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];
  if (file.type && !allowed.includes(file.type)) {
    return fail("仅支持 PDF 或图片（png/jpg/webp）");
  }

  const saved = await saveUploadedFile(file, category);
  const asset = await prisma.mediaAsset.create({
    data: {
      name,
      category,
      fileName: saved.fileName,
      fileUrl: saved.fileUrl,
      mimeType: saved.mimeType,
      fileSize: saved.fileSize,
    },
  });
  return ok(asset, 201);
}
