export type ValidationCode = "future" | "invalid-format" | "out-of-range" | "required" | "too-long";

export type ValidationIssue = Readonly<{
  code: ValidationCode;
  field: string;
}>;

export type ValidationResult<T> =
  | Readonly<{ issues: readonly [ValidationIssue, ...ValidationIssue[]]; ok: false }>
  | Readonly<{ ok: true; value: T }>;

export function invalid<T = never>(issues: readonly ValidationIssue[]): ValidationResult<T> {
  if (!issues.length) throw new Error("Validation failure requires at least one issue");
  return { issues: issues as readonly [ValidationIssue, ...ValidationIssue[]], ok: false };
}

export function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}
