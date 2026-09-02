import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";

import type { RefuellingRepository } from "@/application/repositories/refuelling-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { RefuellingId, VehicleId } from "@/domain/shared/identifiers";

import type { AppDatabase } from "./database";
import { CorruptStoredDataError, mapRefuellingRow } from "./row-mappers";
import { refuellings, vehicles } from "./schema";

type DatabaseTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export class DrizzleRefuellingRepository implements RefuellingRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(refuelling: Refuelling): Promise<RepositoryResult<void>> {
    const operation = "refuelling.create";
    try {
      return this.database.transaction((transaction) => {
        const vehicle = findVehicle(transaction, refuelling.vehicleId);
        if (!vehicle) return repositoryFailure("not-found", operation);
        if (vehicle.fuelTankCapacityMicrolitres === null) {
          return repositoryFailure("conflict", operation);
        }

        const existing = transaction
          .select({ id: refuellings.id })
          .from(refuellings)
          .where(eq(refuellings.id, refuelling.id))
          .limit(1)
          .get();
        if (existing) return repositoryFailure("conflict", operation);

        transaction.insert(refuellings).values(values(refuelling)).run();
        advanceVehicleOdometer(transaction, refuelling);
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async delete(vehicleId: VehicleId, refuellingId: RefuellingId): Promise<RepositoryResult<void>> {
    const operation = "refuelling.delete";
    try {
      const result = this.database
        .delete(refuellings)
        .where(and(eq(refuellings.vehicleId, vehicleId), eq(refuellings.id, refuellingId)))
        .run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async get(
    vehicleId: VehicleId,
    refuellingId: RefuellingId,
  ): Promise<RepositoryResult<Refuelling | null>> {
    const operation = "refuelling.get";
    try {
      const row = this.database
        .select()
        .from(refuellings)
        .where(and(eq(refuellings.vehicleId, vehicleId), eq(refuellings.id, refuellingId)))
        .limit(1)
        .get();
      return repositorySuccess(row ? mapRefuellingRow(row) : null);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Refuelling[]>> {
    const operation = "refuelling.list";
    try {
      return repositorySuccess(
        this.database
          .select()
          .from(refuellings)
          .where(eq(refuellings.vehicleId, vehicleId))
          .orderBy(desc(refuellings.occurredAt), desc(refuellings.createdAt), asc(refuellings.id))
          .all()
          .map(mapRefuellingRow),
      );
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async update(refuelling: Refuelling): Promise<RepositoryResult<void>> {
    const operation = "refuelling.update";
    try {
      return this.database.transaction((transaction) => {
        const vehicle = findVehicle(transaction, refuelling.vehicleId);
        if (!vehicle) return repositoryFailure("not-found", operation);
        if (vehicle.fuelTankCapacityMicrolitres === null) {
          return repositoryFailure("conflict", operation);
        }

        const existing = transaction
          .select({ id: refuellings.id })
          .from(refuellings)
          .where(
            and(eq(refuellings.vehicleId, refuelling.vehicleId), eq(refuellings.id, refuelling.id)),
          )
          .limit(1)
          .get();
        if (!existing) return repositoryFailure("not-found", operation);

        transaction
          .update(refuellings)
          .set(mutableValues(refuelling))
          .where(eq(refuellings.id, refuelling.id))
          .run();
        advanceVehicleOdometer(transaction, refuelling);
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }
}

function findVehicle(transaction: DatabaseTransaction, vehicleId: VehicleId) {
  return transaction
    .select({ fuelTankCapacityMicrolitres: vehicles.fuelTankCapacityMicrolitres })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1)
    .get();
}

function values(refuelling: Refuelling) {
  return {
    createdAt: refuelling.createdAt,
    id: refuelling.id,
    vehicleId: refuelling.vehicleId,
    ...mutableValues(refuelling),
  };
}

function mutableValues(refuelling: Refuelling) {
  return {
    fillKind: refuelling.fillKind,
    inputVolumeUnit: refuelling.inputVolumeUnit,
    occurredAt: refuelling.occurredAt,
    odometerMetres: refuelling.odometerMetres ?? null,
    pricingInputMode: refuelling.pricing?.inputMode ?? null,
    quantityMicrolitres: refuelling.quantityMicrolitres,
    totalCostCurrency: refuelling.pricing?.totalCost.currency ?? null,
    totalCostMinorUnits: refuelling.pricing?.totalCost.minorUnits ?? null,
    unitPriceMilliUnits: refuelling.pricing?.unitPriceMilliUnits ?? null,
    unitPriceVolumeUnit: refuelling.pricing?.unitPriceVolumeUnit ?? null,
    updatedAt: refuelling.updatedAt,
  };
}

function advanceVehicleOdometer(transaction: DatabaseTransaction, refuelling: Refuelling): void {
  if (refuelling.odometerMetres === undefined) return;
  transaction
    .update(vehicles)
    .set({ currentOdometerMetres: refuelling.odometerMetres, updatedAt: refuelling.updatedAt })
    .where(
      and(
        eq(vehicles.id, refuelling.vehicleId),
        or(
          isNull(vehicles.currentOdometerMetres),
          lt(vehicles.currentOdometerMetres, refuelling.odometerMetres),
        ),
      ),
    )
    .run();
}

function mapFailure<T>(operation: string, error: unknown): RepositoryResult<T> {
  return repositoryFailure(
    error instanceof CorruptStoredDataError ? "corrupt-data" : "unavailable",
    operation,
    error,
  );
}
