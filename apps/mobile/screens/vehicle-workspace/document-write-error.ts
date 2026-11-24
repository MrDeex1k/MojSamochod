import type { RepositoryError } from "@/application/repositories/repository-result";

export function documentWriteErrorKey(
  error: RepositoryError,
  fallback: "documents.saveError" | "documents.replaceError",
) {
  if (error.kind === "conflict") return "documents.duplicateError";
  if (error.kind === "unsupported" && error.operation === "managedFile.import") {
    return "documents.invalidFileSize";
  }
  return fallback;
}
