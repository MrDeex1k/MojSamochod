const numberFormatters = new Map<string, Intl.NumberFormat>();
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const decimalSeparators = new Map<string, string>();
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
  const formatter = getCurrencyFormatter(currency, locale);
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minorUnits / 10 ** fractionDigits);
}

export function formatCurrencyInputMinorUnits(
  minorUnits: number,
  currency: string,
  locale: string,
): string {
  const fractionDigits = currencyFractionDigits(currency, locale);
  if (fractionDigits === 0) return String(minorUnits);
  const scale = 10 ** fractionDigits;
  const whole = Math.floor(minorUnits / scale);
  const fraction = String(minorUnits % scale)
    .padStart(fractionDigits, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}${getDecimalSeparator(locale)}${fraction}` : String(whole);
}

export function parseCurrencyInput(
  value: string,
  currency: string,
  locale: string,
):
  | Readonly<{ kind: "empty" }>
  | Readonly<{ kind: "invalid" }>
  | Readonly<{ kind: "value"; minorUnits: number }> {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return { kind: "empty" };
  const fractionDigits = currencyFractionDigits(currency, locale);
  const pattern =
    fractionDigits === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${fractionDigits}})?$`);
  if (!pattern.test(normalized)) return { kind: "invalid" };
  const [whole, fraction = ""] = normalized.split(".");
  const minorUnits =
    Number(whole) * 10 ** fractionDigits + Number(fraction.padEnd(fractionDigits, "0"));
  return Number.isSafeInteger(minorUnits) ? { kind: "value", minorUnits } : { kind: "invalid" };
}

export function currencyFractionDigits(currency: string, locale: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) return 2;
  return getCurrencyFormatter(currency, locale).resolvedOptions().maximumFractionDigits ?? 2;
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

function getCurrencyFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { currency, style: "currency" });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}

function getDecimalSeparator(locale: string): string {
  let separator = decimalSeparators.get(locale);
  if (!separator) {
    separator =
      new Intl.NumberFormat(locale).formatToParts(1.1).find(({ type }) => type === "decimal")
        ?.value ?? ".";
    decimalSeparators.set(locale, separator);
  }
  return separator;
}
