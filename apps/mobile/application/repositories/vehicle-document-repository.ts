import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type {
  DocumentId,
  HistoryEntryId,
  ManagedFileId,
  VehicleId,
} from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export type DocumentCursor = Readonly<{
  documentDate: string | null;
  createdAt: string;
  id: string;
}>;
export type DocumentPage = Readonly<{
  documents: readonly VehicleDocument[];
  nextCursor: DocumentCursor | null;
}>;
export interface VehicleDocumentRepository {
  listPage?(
    vehicleId: VehicleId,
    cursor?: DocumentCursor,
    limit?: number,
  ): Promise<RepositoryResult<DocumentPage>>;
  attachmentCounts?(
    vehicleId: VehicleId,
    ids: readonly HistoryEntryId[],
  ): Promise<RepositoryResult<Readonly<Record<string, number>>>>;
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
