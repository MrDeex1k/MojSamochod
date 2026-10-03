import type { HistoryEntry } from "@/domain/history/history-entry";
import type { HistoryEntryId, VehicleId } from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export type HistoryCursor = Readonly<{ occurredAt: string; createdAt: string; id: string }>;
export type HistoryPage = Readonly<{
  entries: readonly HistoryEntry[];
  nextCursor: HistoryCursor | null;
}>;

export type HistoryEntryReference = Pick<HistoryEntry, "id" | "type" | "occurredAt"> &
  Readonly<{
    subject?: string;
    inspectionKind?: string;
  }>;
export type HistoryReferencePage = Readonly<{
  entries: readonly HistoryEntryReference[];
  nextCursor: HistoryCursor | null;
}>;
export interface HistoryEntryRepository {
  references?(
    vehicleId: VehicleId,
    ids: readonly HistoryEntryId[],
  ): Promise<RepositoryResult<readonly HistoryEntryReference[]>>;
  searchReferences?(
    vehicleId: VehicleId,
    query: string,
    cursor?: HistoryCursor,
  ): Promise<RepositoryResult<HistoryReferencePage>>;

  listPage?(
    vehicleId: VehicleId,
    cursor?: HistoryCursor,
    limit?: number,
  ): Promise<RepositoryResult<HistoryPage>>;
  create(entry: HistoryEntry): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, entryId: HistoryEntryId): Promise<RepositoryResult<void>>;
  get(
    vehicleId: VehicleId,
    entryId: HistoryEntryId,
  ): Promise<RepositoryResult<HistoryEntry | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly HistoryEntry[]>>;
  update(entry: HistoryEntry): Promise<RepositoryResult<void>>;
}
