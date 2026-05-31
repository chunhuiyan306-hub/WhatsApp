"use client";

import { useCallback, useEffect, useState } from "react";

interface Asset {
  id: string;
  name: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "catalog", label: "产品画册 PDF" },
  { value: "quote", label: "报价单 / 价目表" },
  { value: "profile", label: "型材图 / 技术资料" },
  { value: "other", label: "其它" },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("catalog");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/assets");
    const json = await res.json();
    setAssets(json.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name || file.name);
    fd.append("category", category);
    await fetch("/api/assets", { method: "POST", body: fd });
    setUploading(false);
    setName("");
    setFile(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("确定删除此资料？")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    load();
  }

  function fmtSize(n: number | null) {
    if (!n) return "";
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">资料库</h1>
        <p className="mt-1 text-sm text-slate-500">
          上传 PDF 画册、报价单等，在「话术模板」里绑定后，确认发送时会和文字一起发给客户
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={upload}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-700">上传资料</h2>
          <div className="mt-4 space-y-3">
            <input
              placeholder="显示名称，如「2025 产品画册 EN」"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <button
              type="submit"
              disabled={!file || uploading}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {uploading ? "上传中…" : "上传"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            本地开发保存在 public/uploads；部署到 Vercel 后自动使用 Blob 云存储（需在
            Vercel 开启 Blob）。
          </p>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            已上传 · {assets.length}
          </h2>
          {assets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">暂无资料</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {assets.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div>
                    <a
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand hover:underline"
                    >
                      {a.name}
                    </a>
                    <p className="text-xs text-slate-400">
                      {CATEGORIES.find((c) => c.value === a.category)?.label ??
                        a.category}
                      {a.fileSize ? ` · ${fmtSize(a.fileSize)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-xs text-red-500"
                  >
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
