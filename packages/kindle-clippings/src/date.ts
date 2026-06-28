import { MONTHS } from "./locales.ts";

// Month names longest-first so "settembre" wins over a shorter substring.
const MONTH_ENTRIES = [...MONTHS].sort((a, b) => b[0].length - a[0].length);
const TIME = /(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const YEAR = /\b(\d{4})\b/;
// Numeric CJK dates: "2019年9月30日" (Chinese/Japanese). Literal 年/月/日 separators
// so a Western "2024 14:46" (year + time) can't be mistaken for year/month/day.
const CJK = /(\d{4})年(\d{1,2})月(\d{1,2})日/;

/**
 * Parse a Kindle date string to an ISO (UTC) timestamp. Uses the localized month
 * tables (which also cover English) and numeric CJK dates first — the native
 * `Date.parse` is too lenient on foreign strings and returns wrong-but-valid
 * results, so it's only a last resort. Returns undefined if unreadable; the
 * caller then falls back to import time, so a missed date never blocks an
 * annotation.
 */
export function parseDate(raw: string): string | undefined {
  const lower = raw.toLowerCase();
  const time = TIME.exec(lower);
  const ss = time?.[3] ? Number(time[3]) : 0;
  const mm = time ? Number(time[2]) : 0;
  const hh = time ? applyMeridiem(Number(time[1]), lower) : 0;

  const cjk = CJK.exec(lower);
  const ymd = cjk
    ? { year: Number(cjk[1]), month: Number(cjk[2]), day: Number(cjk[3]) }
    : extractWesternYmd(lower, time?.[0]);

  if (ymd) {
    const ms = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hh, mm, ss);
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  }

  const native = Date.parse(raw);
  return Number.isNaN(native) ? undefined : new Date(native).toISOString();
}

function applyMeridiem(hour: number, lower: string): number {
  if (/\bpm\b/.test(lower) && hour < 12) return hour + 12;
  if (/\bam\b/.test(lower) && hour === 12) return 0;
  return hour;
}

function extractWesternYmd(
  lower: string,
  timeText: string | undefined,
): { year: number; month: number; day: number } | undefined {
  const yearMatch = YEAR.exec(lower);
  const month = findMonth(lower);
  // Drop the time so its digits aren't mistaken for the day.
  const withoutTime = timeText ? lower.replace(timeText, " ") : lower;
  const dayMatch = /\b(\d{1,2})\b/.exec(withoutTime);
  if (!yearMatch || month === undefined || !dayMatch) return undefined;
  return { year: Number(yearMatch[1]), month, day: Number(dayMatch[1]) };
}

function findMonth(lower: string): number | undefined {
  for (const [name, number] of MONTH_ENTRIES) {
    if (lower.includes(name)) return number;
  }
  return undefined;
}
