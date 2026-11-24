import type { DocumentCursor, DocumentPage } from "../repositories/vehicle-document-repository";
import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import { maximumDocumentBytes } from "@/application/storage/object-storage";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import {
  createVehicleDocument,
  updateVehicleDocument,
  type VehicleDocument,
  type VehicleDocumentInput,
} from "@/domain/documents/vehicle-document";
import {
  managedFileIdFromUuidV7,
  type DocumentId,
  type HistoryEntryId,
  type VehicleId,
} from "@/domain/shared/identifiers";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import type { PickedDocument } from "./document-file-picker";

export type DocumentMetadataInput = Omit<VehicleDocumentInput, "fileReference" | "vehicleId">;

type DocumentWriteResult<T> =
  | Extract<RepositoryResult<T>, { ok: false }>
  | { ok: true; value: T; affectedHistoryEntryIds: readonly HistoryEntryId[] };

export class VehicleDocumentService {
  private tail: Promise<unknown> = Promise.resolve();

  private enqueue<T extends RepositoryResult<unknown>>(
    operation: string,
    work: () => Promise<T>,
  ): Promise<T | Extract<RepositoryResult<never>, { ok: false }>> {
    const result = this.tail
      .then(work)
      .catch((cause: unknown) => repositoryFailure("unavailable", operation, cause));
    this.tail = result;
    return result;
  }

  private async removeUnreferenced(
    id: Parameters<ManagedFileCoordinator["remove"]>[0],
  ): Promise<void> {
    // Once metadata commits, cleanup failure must not turn success into a retry of the write.
    // Ready/deleting metadata remains available to startup reconciliation.
    await this.managedFiles.remove(id).catch(() => undefined);
  }

  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly repository: VehicleDocumentRepository,
    private readonly managedFiles: ManagedFileCoordinator,
  ) {}

  async create(
    vehicleId: VehicleId,
    file: PickedDocument,
    metadata: DocumentMetadataInput,
  ): Promise<DocumentWriteResult<VehicleDocument>> {
    return this.enqueue("vehicleDocument.create", () => this.createNow(vehicleId, file, metadata));
  }

  /** Imports the file before metadata creation and cleans up the import if creation fails. */
  private async createNow(
    vehicleId: VehicleId,
    file: PickedDocument,
    metadata: DocumentMetadataInput,
  ): Promise<DocumentWriteResult<VehicleDocument>> {
    const fileReference = managedFileIdFromUuidV7(this.idGenerator.generate());
    const document = createVehicleDocument(
      { ...metadata, fileReference, vehicleId },
      { clock: this.clock, idGenerator: this.idGenerator },
    );
    if (!document.ok) {
      return repositoryFailure("unsupported", "vehicleDocument.create", document.issues);
    }
    const imported = await this.importFile(file, fileReference);
    if (!imported.ok) return imported;
    const created = await this.repository.create(document.value);
    if (!created.ok) {
      await this.removeUnreferenced(imported.value.id);
      return created;
    }
    return documentWriteSuccess(document.value, undefined, document.value.historyEntryId);
  }

  async delete(vehicleId: VehicleId, documentId: DocumentId): Promise<DocumentWriteResult<void>> {
    return this.enqueue("vehicleDocument.delete", () => this.deleteNow(vehicleId, documentId));
  }

  /** Commits metadata deletion before attempting binary cleanup, which startup can retry. */
  private async deleteNow(
    vehicleId: VehicleId,
    documentId: DocumentId,
  ): Promise<DocumentWriteResult<void>> {
    const deleted = await this.repository.delete(vehicleId, documentId);
    if (!deleted.ok) return deleted;
    // Metadata deletion is the user-visible operation. If binary cleanup is interrupted,
    // reconciliation removes the now-unreferenced managed file on the next application start.
    await this.removeUnreferenced(deleted.value.fileReference);
    return documentWriteSuccess(undefined, deleted.value.historyEntryId, undefined);
  }

  get(vehicleId: VehicleId, documentId: DocumentId) {
    return this.repository.get(vehicleId, documentId);
  }

  list(vehicleId: VehicleId) {
    return this.repository.list(vehicleId);
  }

  async listPage(
    vehicleId: VehicleId,
    cursor?: DocumentCursor,
    limit?: number,
  ): Promise<RepositoryResult<DocumentPage>> {
    if (this.repository.listPage) return this.repository.listPage(vehicleId, cursor, limit);
    const result = await this.repository.list(vehicleId);
    return result.ok ? repositorySuccess({ documents: result.value, nextCursor: null }) : result;
  }

  async attachmentCounts(vehicleId: VehicleId, ids: readonly HistoryEntryId[]) {
    if (this.repository.attachmentCounts) return this.repository.attachmentCounts(vehicleId, ids);
    const result = await this.repository.list(vehicleId);
    if (!result.ok) return result;
    const selected = new Set(ids);
    const counts: Record<string, number> = {};
    for (const document of result.value)
      if (document.historyEntryId && selected.has(document.historyEntryId))
        counts[document.historyEntryId] = (counts[document.historyEntryId] ?? 0) + 1;
    return repositorySuccess(counts);
  }

  async getFile(
    document: VehicleDocument,
  ): Promise<RepositoryResult<Readonly<{ mimeType: string; name: string; uri: string }> | null>> {
    const uri = await this.managedFiles.getReadyUri(document.fileReference);
    if (!uri.ok) return uri;
    if (!uri.value) return repositorySuccess(null);
    const metadata = await this.managedFiles.getReady(document.fileReference);
    if (!metadata.ok) return metadata;
    if (!metadata.value) return repositorySuccess(null);
    return repositorySuccess({
      mimeType: metadata.value.mimeType,
      name: metadata.value.originalName,
      uri: uri.value,
    });
  }

  async replace(
    existing: VehicleDocument,
    file: PickedDocument,
  ): Promise<RepositoryResult<VehicleDocument>> {
    return this.enqueue("vehicleDocument.replace", () => this.replaceNow(existing, file));
  }

  /** Reloads current metadata before replacing its file and cleans up only after commit. */
  private async replaceNow(
    existing: VehicleDocument,
    file: PickedDocument,
  ): Promise<RepositoryResult<VehicleDocument>> {
    const stored = await this.repository.get(existing.vehicleId, existing.id);
    if (!stored.ok) return stored;
    if (!stored.value) return repositoryFailure("not-found", "vehicleDocument.replace");
    existing = stored.value;
    const imported = await this.importFile(file);
    if (!imported.ok) return imported;
    const updated = updateVehicleDocument(
      existing,
      { ...existing, fileReference: imported.value.id },
      this.clock,
    );
    if (!updated.ok) {
      await this.removeUnreferenced(imported.value.id);
      return repositoryFailure("unsupported", "vehicleDocument.replace", updated.issues);
    }
    const saved = await this.repository.update(updated.value);
    if (!saved.ok) {
      await this.removeUnreferenced(imported.value.id);
      return saved;
    }
    await this.removeUnreferenced(existing.fileReference);
    return repositorySuccess(updated.value);
  }

  async update(
    existing: VehicleDocument,
    metadata: DocumentMetadataInput,
  ): Promise<DocumentWriteResult<VehicleDocument>> {
    return this.enqueue("vehicleDocument.update", () => this.updateNow(existing, metadata));
  }

  /** Applies metadata edits to the stored document so stale editors retain its current file. */
  private async updateNow(
    existing: VehicleDocument,
    metadata: DocumentMetadataInput,
  ): Promise<DocumentWriteResult<VehicleDocument>> {
    const stored = await this.repository.get(existing.vehicleId, existing.id);
    if (!stored.ok) return stored;
    if (!stored.value) return repositoryFailure("not-found", "vehicleDocument.update");
    existing = stored.value;
    const updated = updateVehicleDocument(
      existing,
      { ...metadata, fileReference: existing.fileReference, vehicleId: existing.vehicleId },
      this.clock,
    );
    if (!updated.ok) {
      return repositoryFailure("unsupported", "vehicleDocument.update", updated.issues);
    }
    const saved = await this.repository.update(updated.value);
    return saved.ok
      ? documentWriteSuccess(updated.value, existing.historyEntryId, updated.value.historyEntryId)
      : saved;
  }

  private async importFile(
    file: PickedDocument,
    id = managedFileIdFromUuidV7(this.idGenerator.generate()),
  ) {
    if (file.size !== undefined && (file.size <= 0 || file.size > maximumDocumentBytes))
      return repositoryFailure("unsupported", "managedFile.import");
    return this.managedFiles.import({
      kind: "document",
      managedFileId: id,
      mimeType: file.mimeType,
      originalName: file.name,
      sourceUri: file.uri,
    });
  }
}

function documentWriteSuccess<T>(
  value: T,
  before: HistoryEntryId | undefined,
  after: HistoryEntryId | undefined,
): DocumentWriteResult<T> {
  return {
    ok: true,
    value,
    affectedHistoryEntryIds:
      before === after ? [] : [before, after].filter((id) => id !== undefined),
  };
}
