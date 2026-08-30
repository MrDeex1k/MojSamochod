import type { HistoryEntry } from "@/domain/history/history-entry";
import type { HistoryEntryId, VehicleId } from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export interface HistoryEntryRepository {
  create(entry: HistoryEntry): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, entryId: HistoryEntryId): Promise<RepositoryResult<void>>;
  get(
    vehicleId: VehicleId,
    entryId: HistoryEntryId,
  ): Promise<RepositoryResult<HistoryEntry | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly HistoryEntry[]>>;
  update(entry: HistoryEntry): Promise<RepositoryResult<void>>;
}
