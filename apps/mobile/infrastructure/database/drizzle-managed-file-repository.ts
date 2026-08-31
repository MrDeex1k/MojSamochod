import { and, eq, isNull, ne, or } from "drizzle-orm";

import type { ManagedFileRepository } from "@/application/repositories/managed-file-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import {
  byteSize,
  sha256Digest,
  storageObjectKey,
  type DeletingManagedFileMetadata,
  type ManagedFileMetadata,
  type ReadyManagedFileMetadata,
  type Sha256Digest,
  type StagedManagedFileMetadata,
  type StorageObjectKey,
} from "@/domain/files/managed-file";
import { managedFileIdFromUuidV7, type ManagedFileId } from "@/domain/shared/identifiers";
import { utcTimestamp, type UtcTimestamp } from "@/domain/shared/value-objects";

import type { AppDatabase } from "./database";
import { managedFiles, vehicleDocuments, vehicles } from "./schema";

type ManagedFileRow = typeof managedFiles.$inferSelect;

export class DrizzleManagedFileRepository implements ManagedFileRepository {
  constructor(private readonly database: AppDatabase) {}

  async createStaged(metadata: StagedManagedFileMetadata): Promise<RepositoryResult<void>> {
    const operation = "managedFile.createStaged";
    try {
      this.database
        .insert(managedFiles)
        .values({
          byteSize: metadata.byteSize,
          createdAt: metadata.createdAt,
          id: metadata.id,
          kind: metadata.kind,
          mimeType: metadata.mimeType,
          originalName: metadata.originalName,
          sha256: metadata.sha256,
          stagingKey: metadata.stagingKey,
          status: "staged",
          storageKey: null,
          updatedAt: metadata.updatedAt,
        })
        .run();
      return repositorySuccess(undefined);
    } catch (error) {
      return repositoryFailure(
        isUniqueConstraintViolation(error) ? "conflict" : "unavailable",
        operation,
        error,
      );
    }
  }

  async delete(id: ManagedFileId): Promise<RepositoryResult<void>> {
    const operation = "managedFile.delete";
    try {
      const result = this.database.delete(managedFiles).where(eq(managedFiles.id, id)).run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }

  async getReady(id: ManagedFileId): Promise<RepositoryResult<ReadyManagedFileMetadata | null>> {
    const operation = "managedFile.getReady";
    try {
      const row = this.database
        .select()
        .from(managedFiles)
        .where(eq(managedFiles.id, id))
        .limit(1)
        .get();
      if (!row || row.status !== "ready") return repositorySuccess(null);
      const metadata = mapManagedFileRow(row);
      return metadata.status === "ready"
        ? repositorySuccess(metadata)
        : repositoryFailure("corrupt-data", operation);
    } catch (error) {
      return repositoryFailure("corrupt-data", operation, error);
    }
  }

  async findReadyBySha256(
    kind: "document",
    sha256: Sha256Digest,
  ): Promise<RepositoryResult<ReadyManagedFileMetadata | null>> {
    const operation = "managedFile.findReadyBySha256";
    try {
      const row = this.database
        .select()
        .from(managedFiles)
        .where(
          and(
            eq(managedFiles.kind, kind),
            eq(managedFiles.sha256, sha256),
            eq(managedFiles.status, "ready"),
          ),
        )
        .limit(1)
        .get();
      if (!row) return repositorySuccess(null);
      const metadata = mapManagedFileRow(row);
      return metadata.status === "ready"
        ? repositorySuccess(metadata)
        : repositoryFailure("corrupt-data", operation);
    } catch (error) {
      return repositoryFailure("corrupt-data", operation, error);
    }
  }

  async listRecoverable(): Promise<
    RepositoryResult<readonly (DeletingManagedFileMetadata | StagedManagedFileMetadata)[]>
  > {
    const operation = "managedFile.listRecoverable";
    try {
      const metadata = this.database
        .select()
        .from(managedFiles)
        .where(ne(managedFiles.status, "ready"))
        .all()
        .map(mapManagedFileRow);
      return repositorySuccess(
        metadata.filter(
          (value): value is DeletingManagedFileMetadata | StagedManagedFileMetadata =>
            value.status !== "ready",
        ),
      );
    } catch (error) {
      return repositoryFailure("corrupt-data", operation, error);
    }
  }

  async listUnreferencedReadyFiles(): Promise<
    RepositoryResult<readonly ReadyManagedFileMetadata[]>
  > {
    const operation = "managedFile.listUnreferencedReadyFiles";
    try {
      const metadata = this.database
        .select({ managedFile: managedFiles })
        .from(managedFiles)
        .leftJoin(vehicles, eq(vehicles.photoReference, managedFiles.id))
        .leftJoin(vehicleDocuments, eq(vehicleDocuments.fileReference, managedFiles.id))
        .where(
          and(
            eq(managedFiles.status, "ready"),
            or(
              and(eq(managedFiles.kind, "vehicle-photo"), isNull(vehicles.id)),
              and(eq(managedFiles.kind, "document"), isNull(vehicleDocuments.id)),
            ),
          ),
        )
        .all()
        .map(({ managedFile }) => mapManagedFileRow(managedFile));
      return repositorySuccess(
        metadata.filter((value): value is ReadyManagedFileMetadata => value.status === "ready"),
      );
    } catch (error) {
      return repositoryFailure("corrupt-data", operation, error);
    }
  }

  async markDeleting(id: ManagedFileId, updatedAt: UtcTimestamp): Promise<RepositoryResult<void>> {
    const operation = "managedFile.markDeleting";
    try {
      const result = this.database
        .update(managedFiles)
        .set({ status: "deleting", updatedAt })
        .where(and(eq(managedFiles.id, id), eq(managedFiles.status, "ready")))
        .run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }

  async markReady(
    id: ManagedFileId,
    storageKey: StorageObjectKey,
    updatedAt: UtcTimestamp,
  ): Promise<RepositoryResult<void>> {
    return this.updateState(
      id,
      { stagingKey: null, status: "ready", storageKey, updatedAt },
      "managedFile.markReady",
    );
  }

  private async updateState(
    id: ManagedFileId,
    values: Partial<typeof managedFiles.$inferInsert>,
    operation: string,
  ): Promise<RepositoryResult<void>> {
    try {
      const result = this.database
        .update(managedFiles)
        .set(values)
        .where(eq(managedFiles.id, id))
        .run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }
}

function mapManagedFileRow(row: ManagedFileRow): ManagedFileMetadata {
  const common = {
    byteSize: expect(byteSize(row.byteSize)),
    createdAt: expect(utcTimestamp(row.createdAt, "createdAt")),
    id: managedFileIdFromUuidV7(row.id),
    kind: row.kind,
    mimeType: row.mimeType,
    originalName: row.originalName,
    sha256: expect(sha256Digest(row.sha256)),
    updatedAt: expect(utcTimestamp(row.updatedAt, "updatedAt")),
  };

  if (row.status === "staged" && row.stagingKey && !row.storageKey) {
    return { ...common, stagingKey: row.stagingKey, status: row.status };
  }
  if ((row.status === "ready" || row.status === "deleting") && row.storageKey && !row.stagingKey) {
    return { ...common, status: row.status, storageKey: expect(storageObjectKey(row.storageKey)) };
  }
  throw new Error("Managed file location does not match its state");
}

function expect<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Stored managed file violates the domain contract");
  return result.value;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current === "object") {
      const record = current as Readonly<{ cause?: unknown; code?: unknown; message?: unknown }>;
      const code = typeof record.code === "string" ? record.code : "";
      const message = typeof record.message === "string" ? record.message : "";
      if (
        code.includes("SQLITE_CONSTRAINT_UNIQUE") ||
        code.includes("SQLITE_CONSTRAINT_PRIMARYKEY") ||
        /UNIQUE constraint failed/i.test(message)
      ) {
        return true;
      }
      current = record.cause;
      continue;
    }
    if (typeof current === "string" && /UNIQUE constraint failed/i.test(current)) return true;
    break;
  }
  return false;
}
