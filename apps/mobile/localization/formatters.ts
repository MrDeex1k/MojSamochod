const numberFormatters = new Map<string, Intl.NumberFormat>();
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const calendarDateFormatters = new Map<string, Intl.DateTimeFormat>();
const utcDateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatLocalizedNumber(value: number, locale: string): string {
  let formatter = numberFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    numberFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

export function formatCurrencyMinorUnits(
  minorUnits: number,
  currency: string,
  locale: string,
): string {
  const key = `${locale}:${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { currency, style: "currency" });
    currencyFormatters.set(key, formatter);
  }
  return formatter.format(minorUnits / 100);
}

export function formatCalendarDate(
  value: string,
  locale: string,
  dateStyle: "long" | "medium" = "medium",
): string {
  const key = `${locale}:${dateStyle}`;
  let formatter = calendarDateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle, timeZone: "UTC" });
    calendarDateFormatters.set(key, formatter);
  }
  return formatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function formatUtcDateTime(value: Date | string, locale: string): string {
  let formatter = utcDateTimeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone: "UTC",
      year: "numeric",
    });
    utcDateTimeFormatters.set(locale, formatter);
  }
  return formatter.format(typeof value === "string" ? new Date(value) : value);
}
