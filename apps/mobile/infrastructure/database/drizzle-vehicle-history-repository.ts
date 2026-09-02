import { and, asc, desc, eq, isNull, lt, or } from "drizzle-orm";

import type { HistoryEntry } from "@/domain/history/history-entry";
import type { HistoryEntryId, VehicleId } from "@/domain/shared/identifiers";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";

import type { AppDatabase } from "./database";
import { CorruptStoredDataError, mapHistoryRow, mapVehicleRow } from "./row-mappers";
import {
  historyEntries,
  inspectionDetails,
  repairDetails,
  replacementDetails,
  vehicleDocuments,
  vehicles,
} from "./schema";

type DatabaseTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export class DrizzleVehicleHistoryRepository implements VehicleRepository, HistoryEntryRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(vehicle: Vehicle): Promise<RepositoryResult<void>>;
  async create(entry: HistoryEntry): Promise<RepositoryResult<void>>;
  async create(value: Vehicle | HistoryEntry): Promise<RepositoryResult<void>> {
    return "make" in value ? this.createVehicle(value) : this.createHistoryEntry(value);
  }

  async delete(id: VehicleId): Promise<RepositoryResult<void>>;
  async delete(vehicleId: VehicleId, entryId: HistoryEntryId): Promise<RepositoryResult<void>>;
  async delete(vehicleId: VehicleId, entryId?: HistoryEntryId): Promise<RepositoryResult<void>> {
    return entryId ? this.deleteHistoryEntry(vehicleId, entryId) : this.deleteVehicle(vehicleId);
  }

  async get(): Promise<RepositoryResult<Vehicle | null>>;
  async get(
    vehicleId: VehicleId,
    entryId: HistoryEntryId,
  ): Promise<RepositoryResult<HistoryEntry | null>>;
  async get(
    vehicleId?: VehicleId,
    entryId?: HistoryEntryId,
  ): Promise<RepositoryResult<Vehicle | HistoryEntry | null>> {
    return vehicleId && entryId ? this.getHistoryEntry(vehicleId, entryId) : this.getVehicle();
  }

  async list(vehicleId: VehicleId): Promise<RepositoryResult<readonly HistoryEntry[]>> {
    const operation = "historyEntry.list";

    try {
      const rows = this.database
        .select(historySelection)
        .from(historyEntries)
        .leftJoin(inspectionDetails, eq(inspectionDetails.historyEntryId, historyEntries.id))
        .leftJoin(replacementDetails, eq(replacementDetails.historyEntryId, historyEntries.id))
        .leftJoin(repairDetails, eq(repairDetails.historyEntryId, historyEntries.id))
        .where(eq(historyEntries.vehicleId, vehicleId))
        .orderBy(
          desc(historyEntries.occurredAt),
          desc(historyEntries.createdAt),
          asc(historyEntries.id),
        )
        .all();

      return repositorySuccess(rows.map(mapHistoryRow));
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async update(vehicle: Vehicle): Promise<RepositoryResult<void>>;
  async update(entry: HistoryEntry): Promise<RepositoryResult<void>>;
  async update(value: Vehicle | HistoryEntry): Promise<RepositoryResult<void>> {
    return "make" in value ? this.updateVehicle(value) : this.updateHistoryEntry(value);
  }

  private async createVehicle(vehicle: Vehicle): Promise<RepositoryResult<void>> {
    const operation = "vehicle.create";

    try {
      return this.database.transaction((transaction) => {
        const existing = transaction.select({ id: vehicles.id }).from(vehicles).limit(1).get();
        if (existing) return repositoryFailure("conflict", operation);

        transaction.insert(vehicles).values(vehicleValues(vehicle)).run();
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async deleteVehicle(id: VehicleId): Promise<RepositoryResult<void>> {
    const operation = "vehicle.delete";

    try {
      const result = this.database.delete(vehicles).where(eq(vehicles.id, id)).run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async getVehicle(): Promise<RepositoryResult<Vehicle | null>> {
    const operation = "vehicle.get";

    try {
      const row = this.database.select().from(vehicles).limit(1).get();
      return repositorySuccess(row ? mapVehicleRow(row) : null);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async updateVehicle(vehicle: Vehicle): Promise<RepositoryResult<void>> {
    const operation = "vehicle.update";

    try {
      const result = this.database
        .update(vehicles)
        .set(vehicleMutableValues(vehicle))
        .where(eq(vehicles.id, vehicle.id))
        .run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async createHistoryEntry(entry: HistoryEntry): Promise<RepositoryResult<void>> {
    const operation = "historyEntry.create";

    try {
      return this.database.transaction((transaction) => {
        const vehicle = transaction
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.id, entry.vehicleId))
          .limit(1)
          .get();
        if (!vehicle) return repositoryFailure("not-found", operation);

        const existing = transaction
          .select({ id: historyEntries.id })
          .from(historyEntries)
          .where(eq(historyEntries.id, entry.id))
          .limit(1)
          .get();
        if (existing) return repositoryFailure("conflict", operation);

        transaction.insert(historyEntries).values(historyEntryValues(entry)).run();
        insertHistoryDetails(transaction, entry);
        advanceVehicleOdometer(transaction, entry);
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async deleteHistoryEntry(
    vehicleId: VehicleId,
    entryId: HistoryEntryId,
  ): Promise<RepositoryResult<void>> {
    const operation = "historyEntry.delete";

    try {
      return this.database.transaction((transaction) => {
        const entry = transaction
          .select({ id: historyEntries.id })
          .from(historyEntries)
          .where(and(eq(historyEntries.vehicleId, vehicleId), eq(historyEntries.id, entryId)))
          .limit(1)
          .get();
        if (!entry) return repositoryFailure("not-found", operation);
        transaction
          .update(vehicleDocuments)
          .set({ historyEntryId: null })
          .where(
            and(
              eq(vehicleDocuments.vehicleId, vehicleId),
              eq(vehicleDocuments.historyEntryId, entryId),
            ),
          )
          .run();
        transaction.delete(historyEntries).where(eq(historyEntries.id, entryId)).run();
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async getHistoryEntry(
    vehicleId: VehicleId,
    entryId: HistoryEntryId,
  ): Promise<RepositoryResult<HistoryEntry | null>> {
    const operation = "historyEntry.get";

    try {
      const row = this.database
        .select(historySelection)
        .from(historyEntries)
        .leftJoin(inspectionDetails, eq(inspectionDetails.historyEntryId, historyEntries.id))
        .leftJoin(replacementDetails, eq(replacementDetails.historyEntryId, historyEntries.id))
        .leftJoin(repairDetails, eq(repairDetails.historyEntryId, historyEntries.id))
        .where(and(eq(historyEntries.vehicleId, vehicleId), eq(historyEntries.id, entryId)))
        .limit(1)
        .get();

      return repositorySuccess(row ? mapHistoryRow(row) : null);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  private async updateHistoryEntry(entry: HistoryEntry): Promise<RepositoryResult<void>> {
    const operation = "historyEntry.update";

    try {
      return this.database.transaction((transaction) => {
        const existing = transaction
          .select({ type: historyEntries.type })
          .from(historyEntries)
          .where(
            and(eq(historyEntries.vehicleId, entry.vehicleId), eq(historyEntries.id, entry.id)),
          )
          .limit(1)
          .get();
        if (!existing) return repositoryFailure("not-found", operation);
        if (existing.type !== entry.type) return repositoryFailure("conflict", operation);

        transaction
          .update(historyEntries)
          .set(historyEntryMutableValues(entry))
          .where(eq(historyEntries.id, entry.id))
          .run();
        updateHistoryDetails(transaction, entry);
        advanceVehicleOdometer(transaction, entry);
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }
}

const historySelection = {
  entry: historyEntries,
  inspection: inspectionDetails,
  repair: repairDetails,
  replacement: replacementDetails,
};

function vehicleValues(vehicle: Vehicle) {
  return {
    createdAt: vehicle.createdAt,
    currentOdometerMetres: vehicle.currentOdometerMetres ?? null,
    id: vehicle.id,
    ...vehicleMutableValues(vehicle),
  };
}

function vehicleMutableValues(vehicle: Vehicle) {
  return {
    distanceUnitPreference: vehicle.distanceUnitPreference,
    fuelConsumptionUnitPreference: vehicle.fuelConsumptionUnitPreference ?? null,
    fuelTankCapacityMicrolitres: vehicle.fuelTankCapacityMicrolitres ?? null,
    fuelVolumeUnitPreference: vehicle.fuelVolumeUnitPreference ?? null,
    initialOdometerMetres: vehicle.initialOdometerMetres ?? null,
    make: vehicle.make,
    manufactureYear: vehicle.manufactureYear ?? null,
    model: vehicle.model,
    photoReference: vehicle.photoReference ?? null,
    registrationNumber: vehicle.registrationNumber ?? null,
    updatedAt: vehicle.updatedAt,
    variant: vehicle.variant ?? null,
    vin: vehicle.vin ?? null,
  };
}

function historyEntryValues(entry: HistoryEntry) {
  return {
    ...historyEntryMutableValues(entry),
    createdAt: entry.createdAt,
    id: entry.id,
    type: entry.type,
    vehicleId: entry.vehicleId,
  };
}

function historyEntryMutableValues(entry: HistoryEntry) {
  return {
    costCurrency: entry.cost?.currency ?? null,
    costMinorUnits: entry.cost?.minorUnits ?? null,
    notes: entry.notes ?? null,
    occurredAt: entry.occurredAt,
    odometerMetres: entry.odometerMetres ?? null,
    serviceProvider: entry.serviceProvider ?? null,
    updatedAt: entry.updatedAt,
  };
}

function insertHistoryDetails(transaction: DatabaseTransaction, entry: HistoryEntry): void {
  switch (entry.type) {
    case "inspection":
      transaction
        .insert(inspectionDetails)
        .values({
          description: entry.details.description ?? null,
          historyEntryId: entry.id,
          kind: entry.details.kind,
          result: entry.details.result,
        })
        .run();
      break;
    case "replacement":
      transaction
        .insert(replacementDetails)
        .values({
          historyEntryId: entry.id,
          item: entry.details.item,
          manufacturer: entry.details.manufacturer ?? null,
          partNumber: entry.details.partNumber ?? null,
        })
        .run();
      break;
    case "repair":
      transaction
        .insert(repairDetails)
        .values({
          description: entry.details.description ?? null,
          historyEntryId: entry.id,
          subject: entry.details.subject,
        })
        .run();
      break;
  }
}

function updateHistoryDetails(transaction: DatabaseTransaction, entry: HistoryEntry): void {
  let changes: number;

  switch (entry.type) {
    case "inspection":
      changes = transaction
        .update(inspectionDetails)
        .set({
          description: entry.details.description ?? null,
          kind: entry.details.kind,
          result: entry.details.result,
        })
        .where(eq(inspectionDetails.historyEntryId, entry.id))
        .run().changes;
      break;
    case "replacement":
      changes = transaction
        .update(replacementDetails)
        .set({
          item: entry.details.item,
          manufacturer: entry.details.manufacturer ?? null,
          partNumber: entry.details.partNumber ?? null,
        })
        .where(eq(replacementDetails.historyEntryId, entry.id))
        .run().changes;
      break;
    case "repair":
      changes = transaction
        .update(repairDetails)
        .set({
          description: entry.details.description ?? null,
          subject: entry.details.subject,
        })
        .where(eq(repairDetails.historyEntryId, entry.id))
        .run().changes;
      break;
  }

  if (changes === 0) throw new CorruptStoredDataError(`${entry.type}Details`);
}

function advanceVehicleOdometer(transaction: DatabaseTransaction, entry: HistoryEntry): void {
  if (entry.odometerMetres === undefined) return;

  transaction
    .update(vehicles)
    .set({ currentOdometerMetres: entry.odometerMetres, updatedAt: entry.updatedAt })
    .where(
      and(
        eq(vehicles.id, entry.vehicleId),
        or(
          isNull(vehicles.currentOdometerMetres),
          lt(vehicles.currentOdometerMetres, entry.odometerMetres),
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
