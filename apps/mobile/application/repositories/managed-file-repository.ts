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
  getReady(id: ManagedFileId): Promise<RepositoryResult<ReadyManagedFileMetadata | null>>;
  listUnreferencedVehiclePhotos(): Promise<RepositoryResult<readonly ReadyManagedFileMetadata[]>>;
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
