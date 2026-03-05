/**
 * date-utils.ts
 * Pure date calculation helpers for the timeline.
 * No side-effects — all functions are independently testable.
 */

/** Add (or subtract) N days from a date. Returns a new Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Returns a copy of the date set to midnight (00:00:00.000) local time */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns the first day (Monday) of the ISO week containing `date` */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Returns the first day of the month */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Returns the last day of the month */
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Format a Date as an ISO date string "YYYY-MM-DD" */
export function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an ISO date string "YYYY-MM-DD" to a local midnight Date.
 * NOTE: new Date("YYYY-MM-DD") parses as UTC which shifts the day in
 * negative-offset timezones — this function avoids that.
 */
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Number of whole days from startOfDay(start) to startOfDay(end) */
export function daysBetween(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Returns true when date ranges [aStart, aEnd] and [bStart, bEnd] overlap.
 * Ranges are inclusive on both ends.
 * Overlap condition: aStart <= bEnd AND aEnd >= bStart
 */
export function rangesOverlap(
  aStart: Date, aEnd: Date,
  bStart: Date, bEnd: Date
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/** Number of days in a given month (0-indexed month) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
