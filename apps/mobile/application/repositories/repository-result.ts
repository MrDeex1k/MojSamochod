export type RepositoryErrorKind =
  | "conflict"
  | "corrupt-data"
  | "not-found"
  | "unavailable"
  | "unsupported";

export type RepositoryError = Readonly<{
  cause?: unknown;
  kind: RepositoryErrorKind;
  operation: string;
}>;

export type RepositoryResult<T> =
  | Readonly<{ error: RepositoryError; ok: false }>
  | Readonly<{ ok: true; value: T }>;

export function repositoryFailure<T = never>(
  kind: RepositoryErrorKind,
  operation: string,
  cause?: unknown,
): RepositoryResult<T> {
  return { error: { cause, kind, operation }, ok: false };
}

export function repositorySuccess<T>(value: T): RepositoryResult<T> {
  return { ok: true, value };
}
