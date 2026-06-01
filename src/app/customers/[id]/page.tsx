"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/types";
import { StatusBadge, InquiryBadge, TagBadge } from "@/components/Badges";
import {
  CUSTOMER_STATUSES,
  INQUIRY_TYPES,
  isRtlLang,
  looksRtl,
} from "@/lib/constants";
import { DraftCard } from "@/components/DraftCard";
import { CustomerProfileCard } from "@/components/CustomerProfile";
import { DealStageBadge } from "@/components/Badges";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [c, setC] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`);
    const json = await res.json();
    setC(json.data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchCustomer(data: Record<string, unknown>) {
    await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  async function deleteCustomer() {
    const label = c?.name || c?.waChatId || c?.phone || "此客户";
    if (
      !window.confirm(
        `确定删除「${label}」？\n\n将永久删除全部消息、草稿、背景调查，不可恢复。`
      )
    ) {
      return;
    }
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    router.push("/customers");
  }

  if (loading) return <div className="p-10 text-center text-slate-400">加载中…</div>;
  if (!c)
    return (
      <div className="p-10 text-center text-slate-400">
        客户不存在。<Link href="/customers" className="text-brand-dark">返回列表</Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <Link href="/customers" className="text-sm text-slate-500 hover:text-slate-800">
        ← 返回客户列表
      </Link>

      {/* 头部 */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {c.name || c.waChatId || c.phone || "未命名客户"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {c.phone && <span>{c.phone}</span>}
              {c.country && <span>· {c.country}</span>}
              {c.language && <span>· 语言 {c.language}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DealStageBadge stage={c.dealStage ?? "inquiry"} />
            <select
              value={c.status}
              onChange={(e) => patchCustomer({ status: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <StatusBadge status={c.status} />
            <button
              type="button"
              onClick={deleteCustomer}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>
        </div>

        {/* 中文画像 */}
        <EditableSummary
          value={c.summary ?? ""}
          onSave={(v) => patchCustomer({ summary: v })}
        />
      </div>

      <CustomerProfileCard
        customer={c}
        onPatch={patchCustomer}
        onReload={load}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 左：聊天时间线 */}
        <div className="lg:col-span-2">
          <ChatTimeline customer={c} />
        </div>

        {/* 右：需求 / 标签 / 背景 / 备注 */}
        <div className="space-y-5">
          <InquiriesCard customer={c} reload={load} />
          <TagsCard customer={c} reload={load} />
          <EnrichmentCard customer={c} reload={load} />
          <NotesCard customer={c} onSave={(v) => patchCustomer({ notes: v })} />
        </div>
      </div>

      {/* 回复草稿 */}
      <DraftsCard customer={c} reload={load} />
    </div>
  );
}

function EditableSummary({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  if (!editing) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
        <span className="text-xs font-semibold text-slate-400">中文画像</span>
        <p className="flex-1 text-sm text-slate-700">
          {value || <span className="text-slate-400">暂无，点击编辑添加</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-brand-dark hover:underline"
        >
          编辑
        </button>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-brand"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(text);
            setEditing(false);
          }}
          className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-dark"
        >
          保存
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md px-3 py-1 text-xs text-slate-500"
        >
          取消
        </button>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChatTimeline({ customer }: { customer: Customer }) {
  const messages = customer.messages ?? [];
  return (
    <Card title={`聊天记录（原文 + 中文）· ${messages.length} 条`}>
      {messages.length === 0 ? (
        <p className="text-sm text-slate-400">暂无消息</p>
      ) : (
        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => {
            const out = m.direction === "out";
            const rtl = isRtlLang(m.originalLang) || looksRtl(m.originalText);
            return (
              <div
                key={m.id}
                className={`flex ${out ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    out
                      ? "bg-brand/10 text-slate-800"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p
                    className={`text-sm ${rtl ? "rtl" : ""}`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {m.originalText}
                  </p>
                  {m.translatedZh && (
                    <p className="mt-1 border-t border-slate-200/70 pt-1 text-sm text-emerald-700">
                      {m.translatedZh}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{out ? "我方" : "客户"}</span>
                    {m.originalLang && <span>· {m.originalLang}</span>}
                    <span>· {formatDate(m.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function InquiriesCard({
  customer,
  reload,
}: {
  customer: Customer;
  reload: () => void;
}) {
  const [type, setType] = useState<string>(INQUIRY_TYPES[0].value);
  const [note, setNote] = useState("");

  async function add() {
    await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id, type, note }),
    });
    setNote("");
    reload();
  }
  async function del(id: string) {
    await fetch(`/api/inquiries?id=${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <Card title="需求">
      <div className="space-y-2">
        {customer.inquiries.length === 0 && (
          <p className="text-sm text-slate-400">暂无需求记录</p>
        )}
        {customer.inquiries.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <InquiryBadge type={i.type} />
              {i.note && <span className="text-xs text-slate-500">{i.note}</span>}
            </div>
            <button
              onClick={() => del(i.id)}
              className="text-xs text-slate-300 hover:text-red-500"
            >
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          {INQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注（可选）"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          onClick={add}
          className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
        >
          添加
        </button>
      </div>
    </Card>
  );
}

function TagsCard({
  customer,
  reload,
}: {
  customer: Customer;
  reload: () => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#64748b");

  async function add() {
    if (!name.trim()) return;
    await fetch(`/api/customers/${customer.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    reload();
  }
  async function toggleSync(tagId: string, syncedToWa: boolean) {
    await fetch(`/api/customers/${customer.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId, syncedToWa }),
    });
    reload();
  }
  async function remove(tagId: string) {
    await fetch(`/api/customers/${customer.id}/tags?tagId=${tagId}`, {
      method: "DELETE",
    });
    reload();
  }

  async function saveTagEdit(tagId: string) {
    await fetch(`/api/tags/${tagId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    setEditingId(null);
    reload();
  }

  return (
    <Card title="标签（可编辑，对应 WhatsApp label）">
      <div className="flex flex-wrap gap-2">
        {customer.tags.length === 0 && (
          <p className="text-sm text-slate-400">暂无标签</p>
        )}
        {customer.tags.map((t) => (
          <div key={t.tagId} className="flex flex-col gap-1">
            {editingId === t.tagId ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border border-slate-200"
                  />
                  <button
                    onClick={() => saveTagEdit(t.tagId)}
                    className="text-xs text-brand-dark hover:underline"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-400"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <span className="group inline-flex items-center gap-1">
                <button
                  onClick={() => toggleSync(t.tagId, !t.syncedToWa)}
                  title={t.syncedToWa ? "已同步，点击标记为未同步" : "未同步到 WhatsApp，点击标记已同步"}
                >
                  <TagBadge name={t.tag.name} color={t.tag.color} synced={t.syncedToWa} />
                </button>
                <button
                  onClick={() => {
                    setEditingId(t.tagId);
                    setEditName(t.tag.name);
                    setEditColor(t.tag.color ?? "#64748b");
                  }}
                  className="text-xs text-slate-400 hover:text-brand-dark"
                  title="编辑标签"
                >
                  ✎
                </button>
                <button
                  onClick={() => remove(t.tagId)}
                  className="text-xs text-slate-300 hover:text-red-500"
                  title="从该客户移除"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="新标签名，如 高意向 / 阿拉伯客户"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          onClick={add}
          className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
        >
          添加
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        点击 ✎ 可改标签名和颜色；× 仅从该客户移除。实心圆点 = 已同步 WhatsApp。
      </p>
    </Card>
  );
}

function EnrichmentCard({
  customer,
  reload,
}: {
  customer: Customer;
  reload: () => void;
}) {
  const list = customer.enrichments ?? [];
  async function verify(id: string) {
    await fetch("/api/enrichments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verified: true }),
    });
    reload();
  }
  return (
    <Card title="背景调查">
      {list.length === 0 ? (
        <p className="text-sm text-slate-400">
          暂无资料。让我根据姓名/电话联网检索后会出现在这里。
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 p-3">
              <div className="space-y-1 text-sm">
                {e.company && (
                  <p>
                    <span className="text-slate-400">公司：</span>
                    {e.company}
                  </p>
                )}
                {e.role && (
                  <p>
                    <span className="text-slate-400">职位：</span>
                    {e.role}
                  </p>
                )}
                {e.linkedinUrl && (
                  <p className="truncate">
                    <span className="text-slate-400">LinkedIn：</span>
                    <a
                      href={e.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-dark hover:underline"
                    >
                      {e.linkedinUrl}
                    </a>
                  </p>
                )}
                {e.website && (
                  <p className="truncate">
                    <span className="text-slate-400">网站：</span>
                    <a href={e.website} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">
                      {e.website}
                    </a>
                  </p>
                )}
                {e.note && <p className="text-slate-600">{e.note}</p>}
                {e.source && (
                  <p className="text-xs text-slate-400">来源：{e.source}</p>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-xs ${
                    e.confidence === "high"
                      ? "text-emerald-600"
                      : e.confidence === "medium"
                        ? "text-amber-600"
                        : "text-slate-400"
                  }`}
                >
                  置信度 {e.confidence}
                </span>
                {e.verified ? (
                  <span className="text-xs font-medium text-emerald-600">✓ 已核实</span>
                ) : (
                  <button
                    onClick={() => verify(e.id)}
                    className="rounded-md border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
                  >
                    标记已核实
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotesCard({
  customer,
  onSave,
}: {
  customer: Customer;
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(customer.notes ?? "");
  useEffect(() => setText(customer.notes ?? ""), [customer.notes]);
  return (
    <Card title="销售/跟单备注">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="内部备注…"
        className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-brand"
      />
      <button
        onClick={() => onSave(text)}
        className="mt-2 rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
      >
        保存备注
      </button>
    </Card>
  );
}

function DraftsCard({
  customer,
  reload,
}: {
  customer: Customer;
  reload: () => void;
}) {
  const drafts = customer.drafts ?? [];
  async function patch(id: string, data: Record<string, unknown>) {
    await fetch(`/api/drafts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reload();
  }
  async function del(id: string) {
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <Card title={`回复草稿 · ${drafts.length}`}>
      {drafts.length === 0 ? (
        <p className="text-sm text-slate-400">
          暂无草稿。让我针对客户的消息起草回复后会出现在这里，确认后我再发送。
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              onPatch={patch}
              onDelete={del}
              showCustomerLink={false}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
