export type ValidationCode = "future" | "invalid-format" | "out-of-range" | "required" | "too-long";

export type ValidationIssue = Readonly<{
  code: ValidationCode;
  field: string;
}>;

export type ValidationResult<T> =
  | Readonly<{ issues: readonly ValidationIssue[]; ok: false }>
  | Readonly<{ ok: true; value: T }>;

export function invalid<T = never>(issues: readonly ValidationIssue[]): ValidationResult<T> {
  return { issues, ok: false };
}

export function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}
