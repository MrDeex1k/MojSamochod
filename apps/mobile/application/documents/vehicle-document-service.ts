import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
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
  type VehicleId,
} from "@/domain/shared/identifiers";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import type { PickedDocument } from "@/infrastructure/documents/system-document-picker";

export type DocumentMetadataInput = Omit<VehicleDocumentInput, "fileReference" | "vehicleId">;

export class VehicleDocumentService {
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
  ): Promise<RepositoryResult<VehicleDocument>> {
    const imported = await this.importFile(file);
    if (!imported.ok) return imported;
    const document = createVehicleDocument(
      { ...metadata, fileReference: imported.value.id, vehicleId },
      { clock: this.clock, idGenerator: this.idGenerator },
    );
    if (!document.ok) {
      await this.managedFiles.remove(imported.value.id);
      return repositoryFailure("unsupported", "vehicleDocument.create", document.issues);
    }
    const created = await this.repository.create(document.value);
    if (!created.ok) {
      await this.managedFiles.remove(imported.value.id);
      return created;
    }
    return repositorySuccess(document.value);
  }

  async delete(vehicleId: VehicleId, documentId: DocumentId): Promise<RepositoryResult<void>> {
    const deleted = await this.repository.delete(vehicleId, documentId);
    if (!deleted.ok) return deleted;
    const removed = await this.managedFiles.remove(deleted.value.fileReference);
    return removed.ok ? repositorySuccess(undefined) : removed;
  }

  get(vehicleId: VehicleId, documentId: DocumentId) {
    return this.repository.get(vehicleId, documentId);
  }

  list(vehicleId: VehicleId) {
    return this.repository.list(vehicleId);
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
    const imported = await this.importFile(file);
    if (!imported.ok) return imported;
    const updated = updateVehicleDocument(
      existing,
      { ...existing, fileReference: imported.value.id },
      this.clock,
    );
    if (!updated.ok) {
      await this.managedFiles.remove(imported.value.id);
      return repositoryFailure("unsupported", "vehicleDocument.replace", updated.issues);
    }
    const saved = await this.repository.update(updated.value);
    if (!saved.ok) {
      await this.managedFiles.remove(imported.value.id);
      return saved;
    }
    await this.managedFiles.remove(existing.fileReference);
    return repositorySuccess(updated.value);
  }

  async update(
    existing: VehicleDocument,
    metadata: DocumentMetadataInput,
  ): Promise<RepositoryResult<VehicleDocument>> {
    const updated = updateVehicleDocument(
      existing,
      { ...metadata, fileReference: existing.fileReference, vehicleId: existing.vehicleId },
      this.clock,
    );
    if (!updated.ok) {
      return repositoryFailure("unsupported", "vehicleDocument.update", updated.issues);
    }
    const saved = await this.repository.update(updated.value);
    return saved.ok ? repositorySuccess(updated.value) : saved;
  }

  private async importFile(file: PickedDocument) {
    return this.managedFiles.import({
      kind: "document",
      managedFileId: managedFileIdFromUuidV7(this.idGenerator.generate()),
      mimeType: file.mimeType,
      originalName: file.name,
      sourceUri: file.uri,
    });
  }
}
