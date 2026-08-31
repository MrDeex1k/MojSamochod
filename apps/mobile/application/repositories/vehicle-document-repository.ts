import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { DocumentId, ManagedFileId, VehicleId } from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export interface VehicleDocumentRepository {
  create(document: VehicleDocument): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, documentId: DocumentId): Promise<RepositoryResult<VehicleDocument>>;
  get(
    vehicleId: VehicleId,
    documentId: DocumentId,
  ): Promise<RepositoryResult<VehicleDocument | null>>;
  getByFile(fileReference: ManagedFileId): Promise<RepositoryResult<VehicleDocument | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly VehicleDocument[]>>;
  update(document: VehicleDocument): Promise<RepositoryResult<void>>;
}
