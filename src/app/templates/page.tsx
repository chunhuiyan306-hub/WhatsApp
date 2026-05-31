"use client";

import { useCallback, useEffect, useState } from "react";
import { INQUIRY_TYPES } from "@/lib/constants";

interface Template {
  id: string;
  name: string;
  inquiryType: string;
  targetLang: string;
  draftTarget: string;
  draftZh: string;
  attachAssetIds: string | null;
  isDefault: boolean;
}

interface Asset {
  id: string;
  name: string;
  category: string;
}

const LANGS = [
  { value: "en", label: "英语" },
  { value: "ar", label: "阿拉伯语" },
  { value: "zh", label: "中文" },
  { value: "all", label: "通用" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    inquiryType: "catalog",
    targetLang: "en",
    draftTarget: "",
    draftZh: "",
    attachAssetIds: [] as string[],
    isDefault: true,
  });

  const load = useCallback(async () => {
    const [t, a] = await Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/assets").then((r) => r.json()),
    ]);
    setTemplates(t.data ?? []);
    setAssets(a.data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditing(null);
    setForm({
      name: "",
      inquiryType: "catalog",
      targetLang: "en",
      draftTarget: "",
      draftZh: "",
      attachAssetIds: [],
      isDefault: true,
    });
  }

  function edit(t: Template) {
    setEditing(t.id);
    let ids: string[] = [];
    try {
      ids = t.attachAssetIds ? JSON.parse(t.attachAssetIds) : [];
    } catch {
      ids = [];
    }
    setForm({
      name: t.name,
      inquiryType: t.inquiryType,
      targetLang: t.targetLang,
      draftTarget: t.draftTarget,
      draftZh: t.draftZh,
      attachAssetIds: ids,
      isDefault: t.isDefault,
    });
  }

  async function save() {
    const payload = { ...form };
    const url = editing ? `/api/templates/${editing}` : "/api/templates";
    await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    load();
  }

  async function remove(id: string) {
    if (!confirm("确定删除这条话术？")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    load();
  }

  function toggleAsset(id: string) {
    setForm((f) => ({
      ...f,
      attachAssetIds: f.attachAssetIds.includes(id)
        ? f.attachAssetIds.filter((x) => x !== id)
        : [...f.attachAssetIds, id],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">话术模板</h1>
        <p className="mt-1 text-sm text-slate-500">
          按需求类型（要画册 / 询价 / 带项目）设置你的专属回复，可绑定 PDF 图册一并发送
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            {editing ? "编辑话术" : "新建话术"}
          </h2>
          <div className="mt-4 space-y-3">
            <input
              placeholder="模板名称，如「要画册-英文标准」"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.inquiryType}
                onChange={(e) =>
                  setForm({ ...form, inquiryType: e.target.value })
                }
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              >
                {INQUIRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
                <option value="all">通用</option>
              </select>
              <select
                value={form.targetLang}
                onChange={(e) =>
                  setForm({ ...form, targetLang: e.target.value })
                }
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              >
                {LANGS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="发给客人的原文（WhatsApp 实际发送）"
              value={form.draftTarget}
              onChange={(e) =>
                setForm({ ...form, draftTarget: e.target.value })
              }
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="中文对照（仅看板可见）"
              value={form.draftZh}
              onChange={(e) => setForm({ ...form, draftZh: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-emerald-800"
            />
            {assets.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">
                  绑定随消息发送的 PDF（在「资料库」上传）
                </p>
                <div className="flex flex-wrap gap-2">
                  {assets.map((a) => (
                    <label
                      key={a.id}
                      className={`cursor-pointer rounded-full px-2 py-1 text-xs ${
                        form.attachAssetIds.includes(a.id)
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.attachAssetIds.includes(a.id)}
                        onChange={() => toggleAsset(a.id)}
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              设为该类型+语言的默认话术
            </label>
            <div className="flex gap-2">
              <button
                onClick={save}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                保存
              </button>
              {editing && (
                <button
                  onClick={resetForm}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            已有话术 · {templates.length}
          </h2>
          {templates.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              还没有自定义话术，系统将使用内置默认文案。
            </p>
          ) : (
            <ul className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-slate-100 p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-medium">{t.name}</span>
                      {t.isDefault && (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs text-emerald-700">
                          默认
                        </span>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {INQUIRY_TYPES.find((i) => i.value === t.inquiryType)
                          ?.label ?? t.inquiryType}{" "}
                        · {t.targetLang}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => edit(t)}
                        className="text-xs text-brand"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="text-xs text-red-500"
                      >
                        删
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-slate-600">
                    {t.draftTarget}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
