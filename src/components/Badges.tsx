import { statusLabel, statusColor, inquiryLabel } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {statusLabel(status)}
    </span>
  );
}

export function InquiryBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {inquiryLabel(type)}
    </span>
  );
}

export function TagBadge({
  name,
  color,
  synced,
}: {
  name: string;
  color?: string | null;
  synced?: boolean;
}) {
  const c = color ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${c}1a`, color: c }}
      title={synced ? "已同步到 WhatsApp" : "未同步到 WhatsApp"}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: synced ? c : "transparent", border: `1px solid ${c}` }}
      />
      {name}
    </span>
  );
}
