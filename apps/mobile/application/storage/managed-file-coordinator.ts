import type { ManagedFileRepository } from "@/application/repositories/managed-file-repository";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import type {
  ObjectStorage,
  StagedObject,
  StagedObjectKey,
} from "@/application/storage/object-storage";
import {
  maximumDocumentBytes,
  maximumVehiclePhotoBytes,
} from "@/application/storage/object-storage";
import type { ManagedFileKind, ReadyManagedFileMetadata } from "@/domain/files/managed-file";
import type { ManagedFileId } from "@/domain/shared/identifiers";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestampFromDate } from "@/domain/shared/value-objects";

export type ManagedFileSource = Readonly<{
  kind: ManagedFileKind;
  managedFileId: ManagedFileId;
  mimeType: string;
  originalName: string;
  sourceUri: string;
}>;

export class ManagedFileCoordinator {
  constructor(
    private readonly clock: Clock,
    private readonly repository: ManagedFileRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async import(source: ManagedFileSource): Promise<RepositoryResult<ReadyManagedFileMetadata>> {
    const staged = await this.storage.stage({
      ...source,
      extension: extensionForMimeType(source.mimeType),
      maximumBytes:
        source.kind === "vehicle-photo" ? maximumVehiclePhotoBytes : maximumDocumentBytes,
    });
    if (!staged.ok) return storageFailure(staged.error, "managedFile.import");

    if (source.kind === "document") {
      const duplicate = await this.repository.findReadyBySha256("document", staged.value.sha256);
      if (!duplicate.ok) {
        await this.storage.discard(staged.value.stagingKey);
        return duplicate;
      }
      if (duplicate.value) {
        await this.storage.discard(staged.value.stagingKey);
        return {
          error: {
            cause: { managedFileId: duplicate.value.id },
            kind: "conflict",
            operation: "managedFile.importDuplicate",
          },
          ok: false,
        };
      }
    }

    const timestamp = utcTimestampFromDate(this.clock.now());
    const metadataResult = await this.repository.createStaged({
      byteSize: staged.value.byteSize,
      createdAt: timestamp,
      id: source.managedFileId,
      kind: source.kind,
      mimeType: source.mimeType,
      originalName: source.originalName,
      sha256: staged.value.sha256,
      stagingKey: staged.value.stagingKey,
      status: "staged",
      updatedAt: timestamp,
    });
    if (!metadataResult.ok) {
      await this.storage.discard(staged.value.stagingKey);
      return metadataResult;
    }

    return this.commit(staged.value, source, timestamp);
  }

  async getReadyUri(id: ManagedFileId): Promise<RepositoryResult<string | null>> {
    const metadata = await this.repository.getReady(id);
    if (!metadata.ok) return metadata;
    if (!metadata.value) return { ok: true, value: null };
    const uri = this.storage.getUri(metadata.value.storageKey);
    return uri.ok
      ? { ok: true, value: uri.value }
      : storageFailure(uri.error, "managedFile.getReadyUri");
  }

  getReady(id: ManagedFileId): Promise<RepositoryResult<ReadyManagedFileMetadata | null>> {
    return this.repository.getReady(id);
  }

  async reconcile(onRecovered?: () => void): Promise<RepositoryResult<void>> {
    const pending = await this.repository.listRecoverable();
    if (!pending.ok) return pending;

    const trackedStagingKeys = new Set<string>();
    for (const metadata of pending.value) {
      if (metadata.status === "staged") trackedStagingKeys.add(metadata.stagingKey);
    }
    const stagedKeys = await this.storage.listStagedKeys();
    if (!stagedKeys.ok) return storageFailure(stagedKeys.error, "managedFile.reconcile");
    for (const metadata of pending.value) {
      if (metadata.status === "deleting") continue;

      const staged: StagedObject = {
        byteSize: metadata.byteSize,
        extension: extensionForMimeType(metadata.mimeType),
        managedFileId: metadata.id,
        sha256: metadata.sha256,
        stagingKey: metadata.stagingKey as StagedObjectKey,
      };
      const committed = await this.storage.commit(staged);
      if (!committed.ok) {
        if (committed.error.kind === "not-found") {
          const deleted = await this.repository.delete(metadata.id);
          if (!deleted.ok && deleted.error.kind !== "not-found") return deleted;
          continue;
        }
        return storageFailure(committed.error, "managedFile.reconcile");
      }
      const ready = await this.repository.markReady(
        metadata.id,
        committed.value.storageKey,
        utcTimestampFromDate(this.clock.now()),
      );
      if (!ready.ok) return ready;
    }

    const unreferencedFiles = await this.repository.listUnreferencedReadyFiles();
    if (!unreferencedFiles.ok) return unreferencedFiles;
    // Capture all cleanup candidates before exposing the application. Newly imported files
    // cannot become candidates while the asynchronous cleanup is running.
    onRecovered?.();
    for (const stagingKey of stagedKeys.value) {
      if (trackedStagingKeys.has(stagingKey)) continue;
      const discarded = await this.storage.discard(stagingKey);
      if (!discarded.ok) return storageFailure(discarded.error, "managedFile.reconcile");
    }

    for (const metadata of pending.value) {
      if (metadata.status === "deleting") {
        const removed = await this.storage.delete(metadata.storageKey);
        if (!removed.ok) return storageFailure(removed.error, "managedFile.reconcile");
        const deleted = await this.repository.delete(metadata.id);
        if (!deleted.ok && deleted.error.kind !== "not-found") return deleted;
        continue;
      }
    }
    for (const metadata of unreferencedFiles.value) {
      const removed = await this.remove(metadata.id);
      if (!removed.ok) return removed;
    }

    return { ok: true, value: undefined };
  }

  async remove(id: ManagedFileId): Promise<RepositoryResult<void>> {
    const metadata = await this.repository.getReady(id);
    if (!metadata.ok) return metadata;
    if (!metadata.value) return { ok: true, value: undefined };

    const deleting = await this.repository.markDeleting(id, utcTimestampFromDate(this.clock.now()));
    if (!deleting.ok) return deleting;
    const removed = await this.storage.delete(metadata.value.storageKey);
    if (!removed.ok) return storageFailure(removed.error, "managedFile.remove");
    const deleted = await this.repository.delete(id);
    return !deleted.ok && deleted.error.kind === "not-found"
      ? { ok: true, value: undefined }
      : deleted;
  }

  private async commit(
    staged: StagedObject,
    source: ManagedFileSource,
    timestamp: ReturnType<typeof utcTimestampFromDate>,
  ): Promise<RepositoryResult<ReadyManagedFileMetadata>> {
    const committed = await this.storage.commit(staged);
    if (!committed.ok) return storageFailure(committed.error, "managedFile.import");

    const ready = await this.repository.markReady(
      source.managedFileId,
      committed.value.storageKey,
      timestamp,
    );
    if (!ready.ok) return ready;

    return {
      ok: true,
      value: {
        byteSize: committed.value.byteSize,
        createdAt: timestamp,
        id: source.managedFileId,
        kind: source.kind,
        mimeType: source.mimeType,
        originalName: source.originalName,
        sha256: committed.value.sha256,
        status: "ready",
        storageKey: committed.value.storageKey,
        updatedAt: timestamp,
      },
    };
  }
}

function extensionForMimeType(mimeType: string): StagedObject["extension"] {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  return "jpg";
}

function storageFailure<T>(
  error: { cause?: unknown; kind: string },
  operation: string,
): RepositoryResult<T> {
  return {
    error: {
      cause: error.cause,
      kind: error.kind === "not-found" ? "not-found" : "unavailable",
      operation,
    },
    ok: false,
  };
}
