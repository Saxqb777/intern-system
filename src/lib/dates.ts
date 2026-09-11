const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ARABIC_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The whole system runs on Gulf Standard Time, which never shifts. */
export const TZ_OFFSET_MINUTES = 4 * 60;

/** Today in the office, as YYYY-MM-DD, regardless of where the server sits. */
export function officeToday(now: Date = new Date()): string {
  return isoDate(new Date(now.getTime() + TZ_OFFSET_MINUTES * 60_000));
}

/** Wall clock time in the office, as HH:MM. */
export function officeTime(at: Date | string | null): string | null {
  if (!at) return null;
  const d = typeof at === "string" ? new Date(at) : at;
  if (Number.isNaN(d.getTime())) return null;
  const shifted = new Date(d.getTime() + TZ_OFFSET_MINUTES * 60_000);
  return (
    String(shifted.getUTCHours()).padStart(2, "0") +
    ":" +
    String(shifted.getUTCMinutes()).padStart(2, "0")
  );
}

function isoDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    "-" +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dayShort(iso: string): string {
  return DAY_NAMES[parseDate(iso).getUTCDay()];
}

export function dayLong(iso: string): string {
  return LONG_DAYS[parseDate(iso).getUTCDay()];
}

export function dayArabic(iso: string): string {
  return ARABIC_DAYS[parseDate(iso).getUTCDay()];
}

/** "Sep 07, 2026", the way the university sheet writes it. */
export function sheetDate(iso: string): string {
  const d = parseDate(iso);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}, ${d.getUTCFullYear()}`;
}

/** "11 Sep 2026" for the screen, where the sheet format reads stiff. */
export function niceDate(iso: string): string {
  const d = parseDate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function isWeekday(iso: string): boolean {
  const day = parseDate(iso).getUTCDay();
  return day >= 1 && day <= 5; // Monday to Friday, the UAE working week
}

/** Every Monday-to-Friday date in a range, inclusive, in order. */
export function weekdaysBetween(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const end = parseDate(toIso);
  const cursor = parseDate(fromIso);

  while (cursor <= end) {
    const iso = isoDate(cursor);
    if (isWeekday(iso)) out.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Week number counted from the first day of the internship, so week 1 is the
 * first week of the placement and not the first week of the calendar year.
 */
export function weekOf(iso: string, internshipStart: string): number {
  const start = parseDate(internshipStart);
  // Back up to the Monday of the starting week so partial first weeks count as week 1.
  const startDay = start.getUTCDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  start.setUTCDate(start.getUTCDate() + mondayOffset);

  const diffDays = Math.floor(
    (parseDate(iso).getTime() - start.getTime()) / 86_400_000
  );
  return Math.floor(diffDays / 7) + 1;
}

/** Minutes between two timestamps, floored, never negative. */
export function minutesBetween(
  from: string | null,
  to: string | null
): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return ms > 0 ? Math.floor(ms / 60_000) : 0;
}

/** 194 becomes "3h 14m". */
export function humanMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
