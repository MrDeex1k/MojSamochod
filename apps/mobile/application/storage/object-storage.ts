import type { ByteSize, Sha256Digest, StorageObjectKey } from "@/domain/files/managed-file";
import type { ManagedFileId } from "@/domain/shared/identifiers";

declare const stagedObjectKeyBrand: unique symbol;

export type StagedObjectKey = string & { readonly [stagedObjectKeyBrand]: true };

export type ObjectStorageErrorKind =
  | "integrity-failure"
  | "invalid-source"
  | "not-found"
  | "unavailable";

export type ObjectStorageError = Readonly<{
  cause?: unknown;
  kind: ObjectStorageErrorKind;
  operation: string;
}>;

export type ObjectStorageResult<T> =
  | Readonly<{ error: ObjectStorageError; ok: false }>
  | Readonly<{ ok: true; value: T }>;

export type StagedObject = Readonly<{
  byteSize: ByteSize;
  managedFileId: ManagedFileId;
  sha256: Sha256Digest;
  stagingKey: StagedObjectKey;
}>;

export type StoredObject = Readonly<{
  byteSize: ByteSize;
  managedFileId: ManagedFileId;
  sha256: Sha256Digest;
  storageKey: StorageObjectKey;
}>;

export interface ObjectStorage {
  /** Copies an external URI into private staging storage and computes its integrity metadata. */
  stage(
    input: Readonly<{ managedFileId: ManagedFileId; sourceUri: string }>,
  ): Promise<ObjectStorageResult<StagedObject>>;

  /** Makes a staged object durable. Repeating the same commit must return the same stored object. */
  commit(stagedObject: StagedObject): Promise<ObjectStorageResult<StoredObject>>;

  /** Removes an uncommitted object. Missing staging objects are treated as successfully discarded. */
  discard(stagingKey: StagedObjectKey): Promise<ObjectStorageResult<void>>;

  /** Lists private staging objects so reconciliation can remove copies without database metadata. */
  listStagedKeys(): Promise<ObjectStorageResult<readonly StagedObjectKey[]>>;

  /** Removes a durable object. Missing objects are treated as successfully deleted. */
  delete(storageKey: StorageObjectKey): Promise<ObjectStorageResult<void>>;

  /** Copies a durable object to a caller-provided URI for sharing or archive creation. */
  copyTo(storageKey: StorageObjectKey, destinationUri: string): Promise<ObjectStorageResult<void>>;
}

export function objectStorageFailure<T = never>(
  kind: ObjectStorageErrorKind,
  operation: string,
  cause?: unknown,
): ObjectStorageResult<T> {
  return { error: { cause, kind, operation }, ok: false };
}

export function objectStorageSuccess<T>(value: T): ObjectStorageResult<T> {
  return { ok: true, value };
}
