import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { RefuellingId, VehicleId } from "@/domain/shared/identifiers";

import type { RepositoryResult } from "./repository-result";

export interface RefuellingRepository {
  create(refuelling: Refuelling): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, refuellingId: RefuellingId): Promise<RepositoryResult<void>>;
  get(
    vehicleId: VehicleId,
    refuellingId: RefuellingId,
  ): Promise<RepositoryResult<Refuelling | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Refuelling[]>>;
  update(refuelling: Refuelling): Promise<RepositoryResult<void>>;
}
