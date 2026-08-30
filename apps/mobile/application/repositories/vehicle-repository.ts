import type { VehicleId } from "@/domain/shared/identifiers";
import type { Vehicle } from "@/domain/vehicle/vehicle";

import type { RepositoryResult } from "./repository-result";

export interface VehicleRepository {
  create(vehicle: Vehicle): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId): Promise<RepositoryResult<void>>;
  get(): Promise<RepositoryResult<Vehicle | null>>;
  update(vehicle: Vehicle): Promise<RepositoryResult<void>>;
}
