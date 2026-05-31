/** 扫描时间表（本地时区，与 scripts/schedule-utils.mjs 保持一致） */

export const DEFAULT_SCHEDULE = ["10:00", "15:00"];

export function parseSchedule(raw?: string | string[] | null): string[] {
  if (!raw) return [...DEFAULT_SCHEDULE];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr) && arr.length) return arr.map(String);
  } catch {
    /* fall through */
  }
  return String(raw)
    .split(/[,;|\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{1,2}:\d{2}$/.test(s));
}

export function getNextScanAt(
  schedule: string | string[] | null | undefined,
  now = new Date()
): Date | null {
  const times = parseSchedule(schedule);
  if (!times.length) return null;

  const candidates: Date[] = [];
  for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(h, m, 0, 0);
      if (d > now) candidates.push(d);
    }
  }
  if (!candidates.length) {
    const [h, m] = times[0].split(":").map(Number);
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d;
  }
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

export function formatScheduleLabel(
  schedule: string | string[] | null | undefined
): string {
  return parseSchedule(schedule).join("、");
}
