import type { ConsumptionRecord } from "@/domain/refuelling/fuel-consumption";
import type { HistoryCursor } from "./history-entry-repository";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { RefuellingId, VehicleId } from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export type RefuellingPage = Readonly<{
  refuellings: readonly Refuelling[];
  nextCursor: HistoryCursor | null;
}>;
export interface RefuellingRepository {
  listPage?(
    vehicleId: VehicleId,
    cursor?: HistoryCursor,
  ): Promise<RepositoryResult<RefuellingPage>>;
  consumptionRecords?(
    vehicleId: VehicleId,
  ): Promise<RepositoryResult<readonly ConsumptionRecord[]>>;

  create(refuelling: Refuelling): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, refuellingId: RefuellingId): Promise<RepositoryResult<void>>;
  get(
    vehicleId: VehicleId,
    refuellingId: RefuellingId,
  ): Promise<RepositoryResult<Refuelling | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Refuelling[]>>;
  update(refuelling: Refuelling): Promise<RepositoryResult<void>>;
}
