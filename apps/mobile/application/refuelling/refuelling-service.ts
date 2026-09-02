import type { RefuellingRepository } from "@/application/repositories/refuelling-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import {
  calculateFuelConsumption,
  type FuelConsumptionSummary,
} from "@/domain/refuelling/fuel-consumption";
import {
  createRefuelling,
  updateRefuelling,
  type CreateRefuellingInput,
  type Refuelling,
} from "@/domain/refuelling/refuelling";
import type { RefuellingId, VehicleId } from "@/domain/shared/identifiers";
import type { Clock, IdGenerator } from "@/domain/shared/ports";

export type RefuellingHistory = Readonly<{
  consumption: FuelConsumptionSummary;
  refuellings: readonly Refuelling[];
}>;

export class RefuellingService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly repository: RefuellingRepository,
  ) {}

  async create(input: CreateRefuellingInput): Promise<RepositoryResult<Refuelling>> {
    const refuelling = createRefuelling(input, {
      clock: this.clock,
      idGenerator: this.idGenerator,
    });
    if (!refuelling.ok) {
      return repositoryFailure("unsupported", "refuelling.create", refuelling.issues);
    }

    const created = await this.repository.create(refuelling.value);
    return created.ok ? repositorySuccess(refuelling.value) : created;
  }

  delete(vehicleId: VehicleId, refuellingId: RefuellingId): Promise<RepositoryResult<void>> {
    return this.repository.delete(vehicleId, refuellingId);
  }

  get(
    vehicleId: VehicleId,
    refuellingId: RefuellingId,
  ): Promise<RepositoryResult<Refuelling | null>> {
    return this.repository.get(vehicleId, refuellingId);
  }

  async list(vehicleId: VehicleId): Promise<RepositoryResult<RefuellingHistory>> {
    const result = await this.repository.list(vehicleId);
    return result.ok
      ? repositorySuccess({
          consumption: calculateFuelConsumption(result.value),
          refuellings: result.value,
        })
      : result;
  }

  async update(
    existing: Refuelling,
    input: CreateRefuellingInput,
  ): Promise<RepositoryResult<Refuelling>> {
    const refuelling = updateRefuelling(existing, input, this.clock);
    if (!refuelling.ok) {
      return repositoryFailure("unsupported", "refuelling.update", refuelling.issues);
    }

    const updated = await this.repository.update(refuelling.value);
    return updated.ok ? repositorySuccess(refuelling.value) : updated;
  }
}
