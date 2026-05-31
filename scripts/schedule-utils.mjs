/** 扫描时间表工具（本地时区） */

export const DEFAULT_SCHEDULE = ["10:00", "15:00"];

export function parseSchedule(raw) {
  if (!raw) return [...DEFAULT_SCHEDULE];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) return arr.map(String);
  } catch {
    /* fall through */
  }
  return String(raw)
    .split(/[,;|\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{1,2}:\d{2}$/.test(s));
}

/** 当前时刻对应的计划时段 key，宽限 2 分钟内 */
export function currentSlotKey(schedule, now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const mins = now.getHours() * 60 + now.getMinutes();

  for (const t of parseSchedule(schedule)) {
    const [h, m] = t.split(":").map(Number);
    const slotMins = h * 60 + m;
    if (Math.abs(mins - slotMins) <= 2) {
      return `${date}@${t}`;
    }
  }
  return null;
}

/** 下一次扫描时间 */
export function getNextScanAt(schedule, now = new Date()) {
  const times = parseSchedule(schedule);
  if (!times.length) return null;

  const candidates = [];
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

export function msUntilNextScan(schedule, now = new Date()) {
  const next = getNextScanAt(schedule, now);
  if (!next) return 60000;
  return Math.max(5000, next.getTime() - now.getTime());
}

export function formatScheduleLabel(schedule) {
  return parseSchedule(schedule).join("、");
}
