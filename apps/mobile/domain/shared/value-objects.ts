import { invalid, valid, type ValidationIssue, type ValidationResult } from "./result";

declare const currencyCodeBrand: unique symbol;
declare const metresBrand: unique symbol;
declare const utcTimestampBrand: unique symbol;

export type CurrencyCode = string & { readonly [currencyCodeBrand]: true };
export type Metres = number & { readonly [metresBrand]: true };
export type UtcTimestamp = string & { readonly [utcTimestampBrand]: true };

export type Money = Readonly<{
  currency: CurrencyCode;
  minorUnits: number;
}>;

export function countCharacters(value: string): number {
  let count = 0;
  for (const _character of value) count++;
  return count;
}

export function requiredText(
  value: string,
  field: string,
  maximumLength: number,
): ValidationResult<string> {
  const normalized = value.trim();
  const issues: ValidationIssue[] = [];

  if (normalized.includes("\0")) {
    issues.push({ code: "invalid-format", field });
  } else if (normalized.length === 0) {
    issues.push({ code: "required", field });
  } else if (exceedsCharacterLimit(normalized, maximumLength)) {
    issues.push({ code: "too-long", field });
  }

  return issues.length > 0 ? invalid(issues) : valid(normalized);
}

export function optionalText(
  value: string | undefined,
  field: string,
  maximumLength: number,
): ValidationResult<string | undefined> {
  const normalized = value?.trim();

  if (!normalized) {
    return valid(undefined);
  }

  if (normalized.includes("\0")) return invalid([{ code: "invalid-format", field }]);

  if (exceedsCharacterLimit(normalized, maximumLength)) {
    return invalid([{ code: "too-long", field }]);
  }

  return valid(normalized);
}

export function metres(
  value: number | undefined,
  field: string,
): ValidationResult<Metres | undefined> {
  if (value === undefined) {
    return valid(undefined);
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    return invalid([{ code: "out-of-range", field }]);
  }

  return valid(value as Metres);
}

export function money(
  value: MoneyInput | undefined,
  field = "cost",
): ValidationResult<Money | undefined> {
  if (value === undefined) {
    return valid(undefined);
  }

  const issues: ValidationIssue[] = [];

  if (!Number.isSafeInteger(value.minorUnits) || value.minorUnits < 0) {
    issues.push({ code: "out-of-range", field: `${field}.minorUnits` });
  }

  if (!/^[A-Z]{3}$/.test(value.currency)) {
    issues.push({ code: "invalid-format", field: `${field}.currency` });
  }

  if (issues.length > 0) {
    return invalid(issues);
  }

  return valid({
    currency: value.currency as CurrencyCode,
    minorUnits: value.minorUnits,
  });
}

export type MoneyInput = Readonly<{
  currency: string;
  minorUnits: number;
}>;

export function utcTimestamp(value: string, field: string): ValidationResult<UtcTimestamp> {
  const parsed = new Date(value);

  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    value.startsWith("0000") ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    return invalid([{ code: "invalid-format", field }]);
  }

  return valid(value as UtcTimestamp);
}

export function utcTimestampFromDate(value: Date): UtcTimestamp {
  if (!Number.isFinite(value.getTime())) {
    throw new Error("Clock returned an invalid date");
  }

  const result = utcTimestamp(value.toISOString(), "timestamp");
  if (!result.ok) throw new Error("Timestamp must be in years 0001–9999");
  return result.value;
}

function exceedsCharacterLimit(value: string, maximum: number): boolean {
  let count = 0;
  for (const _character of value) if (++count > maximum) return true;
  return false;
}
