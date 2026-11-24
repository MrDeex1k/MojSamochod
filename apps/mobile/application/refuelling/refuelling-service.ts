import type { HistoryCursor } from "@/application/repositories/history-entry-repository";
import type { RefuellingPage } from "@/application/repositories/refuelling-repository";
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
  private readonly summaries = new Map<
    VehicleId,
    Promise<RepositoryResult<FuelConsumptionSummary>>
  >();

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
    if (created.ok) this.summaries.delete(input.vehicleId);
    return created.ok ? repositorySuccess(refuelling.value) : created;
  }

  async delete(vehicleId: VehicleId, refuellingId: RefuellingId): Promise<RepositoryResult<void>> {
    const result = await this.repository.delete(vehicleId, refuellingId);
    if (result.ok) this.summaries.delete(vehicleId);
    return result;
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

  async listPage(
    vehicleId: VehicleId,
    cursor?: HistoryCursor,
  ): Promise<RepositoryResult<RefuellingPage>> {
    if (this.repository.listPage) return this.repository.listPage(vehicleId, cursor);
    const result = await this.repository.list(vehicleId);
    return result.ok ? repositorySuccess({ refuellings: result.value, nextCursor: null }) : result;
  }

  clearConsumptionCache(): void {
    this.summaries.clear();
  }

  consumption(vehicleId: VehicleId): Promise<RepositoryResult<FuelConsumptionSummary>> {
    const cached = this.summaries.get(vehicleId);
    if (cached) return cached;
    const pending = this.calculateConsumption(vehicleId);
    this.summaries.set(vehicleId, pending);
    const clear = () => {
      if (this.summaries.get(vehicleId) === pending) this.summaries.delete(vehicleId);
    };
    void pending.then((result) => {
      if (!result.ok) clear();
    }, clear);
    return pending;
  }

  private async calculateConsumption(vehicleId: VehicleId) {
    const result = this.repository.consumptionRecords
      ? await this.repository.consumptionRecords(vehicleId)
      : await this.repository.list(vehicleId);
    return result.ok ? repositorySuccess(calculateFuelConsumption(result.value)) : result;
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
    // The repository compares against the row it updated, which may differ from the form's draft.
    if (updated.ok && updated.value?.consumptionChanged !== false)
      this.summaries.delete(existing.vehicleId);
    return updated.ok ? repositorySuccess(refuelling.value) : updated;
  }
}
