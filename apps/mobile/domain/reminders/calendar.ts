import { invalid, valid, type ValidationResult } from "../shared/result";

declare const calendarDateBrand: unique symbol;
declare const reminderTimeZoneBrand: unique symbol;

export type CalendarDate = string & { readonly [calendarDateBrand]: true };
export type ReminderTimeZone = string & { readonly [reminderTimeZoneBrand]: true };

export function calendarDate(value: string): ValidationResult<CalendarDate> {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000") ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return invalid([{ code: "invalid-format", field: "dueDate" }]);
  }
  return valid(value as CalendarDate);
}

export function reminderTimeZone(value: string): ValidationResult<ReminderTimeZone> {
  // Require a named zone: a numeric UTC offset would lose seasonal clock changes.
  if (!value || /^[+-]/.test(value) || value.trim() !== value) {
    return invalid([{ code: "invalid-format", field: "timeZone" }]);
  }
  try {
    const zone = formatter(value).resolvedOptions().timeZone;
    return valid(zone as ReminderTimeZone);
  } catch {
    return invalid([{ code: "invalid-format", field: "timeZone" }]);
  }
}

export function dateInReminderZone(now: Date, timeZone: ReminderTimeZone): string {
  assertValidInstant(now);
  return localParts(now, formatter(timeZone)).date;
}

export function subtractCalendarDays(date: CalendarDate, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().split("T")[0]!;
}

export function notificationInstant(date: string, timeZone: ReminderTimeZone): Date | undefined {
  const target = new Date(`${date}T09:00:00.000Z`).getTime();
  const format = formatter(timeZone);
  const candidates = new Set<number>();

  // Sample offsets on both sides of a transition, then verify each candidate by round-trip.
  // This also detects a skipped calendar day instead of silently moving the notification.
  for (const hours of [-48, -24, 0, 24, 48]) {
    const sample = target + hours * 60 * 60 * 1000;
    const parts = localParts(new Date(sample), format);
    const wallTime = Date.parse(`${parts.date}T${parts.time}.000Z`);
    const candidate = target - (wallTime - sample);
    const actual = localParts(new Date(candidate), format);
    if (actual.date === date && actual.time === "09:00:00") candidates.add(candidate);
  }

  // In an overlap use the first occurrence, never schedule both.
  return candidates.size === 0 ? undefined : new Date(Math.min(...candidates));
}

export function assertValidInstant(value: Date): void {
  if (!Number.isFinite(value.getTime())) throw new Error("Expected a valid reminder clock instant");
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    calendar: "gregory",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    numberingSystem: "latn",
    second: "2-digit",
    timeZone,
    year: "numeric",
  });
}

function localParts(date: Date, format: Intl.DateTimeFormat): { date: string; time: string } {
  const parts = format.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((item) => item.type === type)?.value;
    if (value === undefined) throw new Error(`Missing reminder calendar part: ${type}`);
    return value;
  };
  return {
    date: `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}:${part("second")}`,
  };
}
