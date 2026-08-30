import type { ManagedFileId } from "../shared/identifiers";
import { invalid, valid, type ValidationResult } from "../shared/result";
import type { UtcTimestamp } from "../shared/value-objects";

declare const byteSizeBrand: unique symbol;
declare const sha256DigestBrand: unique symbol;
declare const storageObjectKeyBrand: unique symbol;

export type ByteSize = number & { readonly [byteSizeBrand]: true };
export type Sha256Digest = string & { readonly [sha256DigestBrand]: true };
export type StorageObjectKey = string & { readonly [storageObjectKeyBrand]: true };
export type ManagedFileKind = "vehicle-photo" | "document";

export type ManagedFileMetadata = Readonly<{
  byteSize: ByteSize;
  createdAt: UtcTimestamp;
  id: ManagedFileId;
  kind: ManagedFileKind;
  mimeType: string;
  originalName: string;
  sha256: Sha256Digest;
  storageKey: StorageObjectKey;
  updatedAt: UtcTimestamp;
}>;

export function byteSize(value: number): ValidationResult<ByteSize> {
  return Number.isSafeInteger(value) && value >= 0
    ? valid(value as ByteSize)
    : invalid([{ code: "out-of-range", field: "byteSize" }]);
}

export function sha256Digest(value: string): ValidationResult<Sha256Digest> {
  return /^[0-9a-f]{64}$/.test(value)
    ? valid(value as Sha256Digest)
    : invalid([{ code: "invalid-format", field: "sha256" }]);
}

export function storageObjectKey(value: string): ValidationResult<StorageObjectKey> {
  const segments = value.split("/");
  const isValid =
    value.length > 0 &&
    value.length <= 512 &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    segments.every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        /^[a-zA-Z0-9._-]+$/.test(segment),
    );

  return isValid
    ? valid(value as StorageObjectKey)
    : invalid([{ code: "invalid-format", field: "storageKey" }]);
}
