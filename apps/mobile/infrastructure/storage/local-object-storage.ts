import { CryptoDigestAlgorithm, digest } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

import {
  maximumDocumentBytes,
  maximumVehiclePhotoBytes,
  objectStorageFailure,
  objectStorageSuccess,
  type ObjectStorage,
  type ObjectStorageResult,
  type StagedObject,
  type StagedObjectKey,
  type StoredObject,
} from "@/application/storage/object-storage";
import { byteSize, sha256Digest, storageObjectKey } from "@/domain/files/managed-file";
import type { ManagedFileId } from "@/domain/shared/identifiers";

export { maximumDocumentBytes, maximumVehiclePhotoBytes };

export interface ObjectStorageDriver {
  copyFrom(sourceUri: string, key: string): Promise<void>;
  copyTo(key: string, destinationUri: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): boolean;
  list(prefix: string): readonly string[];
  move(fromKey: string, toKey: string): Promise<void>;
  read(key: string): Promise<Uint8Array<ArrayBuffer>>;
  size(key: string): number;
  uri(key: string): string;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly driver: ObjectStorageDriver = new ExpoFileSystemDriver()) {}

  async stage(input: {
    extension: StagedObject["extension"];
    managedFileId: ManagedFileId;
    maximumBytes: number;
    sourceUri: string;
  }): Promise<ObjectStorageResult<StagedObject>> {
    const operation = "objectStorage.stage";
    const stagingKey = `staging/${input.managedFileId}.${input.extension}` as StagedObjectKey;

    try {
      await this.driver.copyFrom(input.sourceUri, stagingKey);
      if (this.driver.size(stagingKey) > input.maximumBytes) {
        await this.driver.delete(stagingKey);
        return objectStorageFailure("invalid-source", operation);
      }
      const bytes = await this.driver.read(stagingKey);
      if (bytes.byteLength > input.maximumBytes) {
        await this.driver.delete(stagingKey);
        return objectStorageFailure("invalid-source", operation);
      }

      const size = byteSize(bytes.byteLength);
      const hash = sha256Digest(toHex(await digest(CryptoDigestAlgorithm.SHA256, bytes)));
      if (!size.ok || !hash.ok) {
        await this.driver.delete(stagingKey);
        return objectStorageFailure("integrity-failure", operation);
      }

      return objectStorageSuccess({
        byteSize: size.value,
        extension: input.extension,
        managedFileId: input.managedFileId,
        sha256: hash.value,
        stagingKey,
      });
    } catch (error) {
      await safelyDelete(this.driver, stagingKey);
      return objectStorageFailure("unavailable", operation, error);
    }
  }

  async commit(stagedObject: StagedObject): Promise<ObjectStorageResult<StoredObject>> {
    const operation = "objectStorage.commit";
    const keyResult = storageObjectKey(
      `objects/${stagedObject.managedFileId}.${stagedObject.extension}`,
    );
    if (!keyResult.ok) return objectStorageFailure("integrity-failure", operation);

    try {
      if (!this.driver.exists(keyResult.value)) {
        await this.driver.move(stagedObject.stagingKey, keyResult.value);
      }
      return objectStorageSuccess({
        byteSize: stagedObject.byteSize,
        managedFileId: stagedObject.managedFileId,
        sha256: stagedObject.sha256,
        storageKey: keyResult.value,
      });
    } catch (error) {
      return objectStorageFailure(
        this.driver.exists(stagedObject.stagingKey) ? "unavailable" : "not-found",
        operation,
        error,
      );
    }
  }

  async discard(stagingKey: StagedObjectKey): Promise<ObjectStorageResult<void>> {
    return this.remove(stagingKey, "objectStorage.discard");
  }

  async listStagedKeys(): Promise<ObjectStorageResult<readonly StagedObjectKey[]>> {
    const operation = "objectStorage.listStagedKeys";
    try {
      return objectStorageSuccess(
        this.driver.list("staging").map((key) => `staging/${key}` as StagedObjectKey),
      );
    } catch (error) {
      return objectStorageFailure("unavailable", operation, error);
    }
  }

  async delete(
    storageKey: Parameters<ObjectStorage["delete"]>[0],
  ): Promise<ObjectStorageResult<void>> {
    return this.remove(storageKey, "objectStorage.delete");
  }

  getUri(storageKey: Parameters<ObjectStorage["getUri"]>[0]): ObjectStorageResult<string> {
    try {
      return this.driver.exists(storageKey)
        ? objectStorageSuccess(this.driver.uri(storageKey))
        : objectStorageFailure("not-found", "objectStorage.getUri");
    } catch (error) {
      return objectStorageFailure("unavailable", "objectStorage.getUri", error);
    }
  }

  async copyTo(
    storageKey: Parameters<ObjectStorage["copyTo"]>[0],
    destinationUri: string,
  ): Promise<ObjectStorageResult<void>> {
    const operation = "objectStorage.copyTo";
    try {
      if (!this.driver.exists(storageKey)) return objectStorageFailure("not-found", operation);
      await this.driver.copyTo(storageKey, destinationUri);
      return objectStorageSuccess(undefined);
    } catch (error) {
      return objectStorageFailure("unavailable", operation, error);
    }
  }

  private async remove(key: string, operation: string): Promise<ObjectStorageResult<void>> {
    try {
      if (this.driver.exists(key)) await this.driver.delete(key);
      return objectStorageSuccess(undefined);
    } catch (error) {
      return objectStorageFailure("unavailable", operation, error);
    }
  }
}

export class ExpoFileSystemDriver implements ObjectStorageDriver {
  private readonly root = new Directory(Paths.document, "managed-objects");

  private ensureDirectories() {
    this.root.create({ idempotent: true, intermediates: true });
    new Directory(this.root, "staging").create({ idempotent: true, intermediates: true });
    new Directory(this.root, "objects").create({ idempotent: true, intermediates: true });
  }

  async copyFrom(sourceUri: string, key: string): Promise<void> {
    this.ensureDirectories();
    await new File(sourceUri).copy(this.file(key), { overwrite: true });
  }

  async copyTo(key: string, destinationUri: string): Promise<void> {
    await this.file(key).copy(new File(destinationUri), { overwrite: true });
  }

  async delete(key: string): Promise<void> {
    this.file(key).delete();
  }

  exists(key: string): boolean {
    return this.file(key).exists;
  }

  list(prefix: string): readonly string[] {
    this.ensureDirectories();
    return new Directory(this.root, prefix).list().map((entry) => entry.name);
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    await this.file(fromKey).move(this.file(toKey), { overwrite: false });
  }

  read(key: string): Promise<Uint8Array<ArrayBuffer>> {
    return this.file(key).bytes();
  }

  size(key: string): number {
    return this.file(key).size;
  }

  uri(key: string): string {
    return this.file(key).uri;
  }

  private file(key: string): File {
    return new File(this.root, ...key.split("/"));
  }
}

async function safelyDelete(driver: ObjectStorageDriver, key: string): Promise<void> {
  try {
    if (driver.exists(key)) await driver.delete(key);
  } catch {
    // Reconciliation retries cleanup after an interrupted or failed staging operation.
  }
}

function toHex(value: ArrayBuffer): string {
  return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function cleanTransientDocumentFiles(): void {
  for (const name of ["document-previews", "document-exports"]) {
    try {
      const directory = new Directory(Paths.cache, name);
      if (directory.exists) directory.delete();
    } catch {
      // Cache cleanup is retried at the next start and must not block usable records.
    }
  }
}
