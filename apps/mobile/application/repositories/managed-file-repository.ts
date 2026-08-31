import type {
  DeletingManagedFileMetadata,
  ReadyManagedFileMetadata,
  StagedManagedFileMetadata,
  StorageObjectKey,
} from "@/domain/files/managed-file";
import type { ManagedFileId } from "@/domain/shared/identifiers";
import type { UtcTimestamp } from "@/domain/shared/value-objects";

import type { RepositoryResult } from "./repository-result";

export interface ManagedFileRepository {
  createStaged(metadata: StagedManagedFileMetadata): Promise<RepositoryResult<void>>;
  delete(id: ManagedFileId): Promise<RepositoryResult<void>>;
  findReadyBySha256(
    kind: "document",
    sha256: ReadyManagedFileMetadata["sha256"],
  ): Promise<RepositoryResult<ReadyManagedFileMetadata | null>>;
  getReady(id: ManagedFileId): Promise<RepositoryResult<ReadyManagedFileMetadata | null>>;
  listUnreferencedReadyFiles(): Promise<RepositoryResult<readonly ReadyManagedFileMetadata[]>>;
  listRecoverable(): Promise<
    RepositoryResult<readonly (DeletingManagedFileMetadata | StagedManagedFileMetadata)[]>
  >;
  markDeleting(id: ManagedFileId, updatedAt: UtcTimestamp): Promise<RepositoryResult<void>>;
  markReady(
    id: ManagedFileId,
    storageKey: StorageObjectKey,
    updatedAt: UtcTimestamp,
  ): Promise<RepositoryResult<void>>;
}
