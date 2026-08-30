import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestampFromDate } from "@/domain/shared/value-objects";
import type { Vehicle } from "@/domain/vehicle/vehicle";

export const vehicleHistoryExportFormat = "moje-auto-vehicle-history";
export const vehicleHistoryExportVersion = 1;

type ExportMoneyV1 = Readonly<{
  currency: string;
  minorUnits: number;
}>;

type ExportHistoryCommonV1 = Readonly<{
  cost: ExportMoneyV1 | null;
  createdAt: string;
  id: string;
  notes: string | null;
  occurredAt: string;
  odometerMetres: number | null;
  serviceProvider: string | null;
  updatedAt: string;
  vehicleId: string;
}>;

type ExportHistoryEntryV1 =
  | (ExportHistoryCommonV1 &
      Readonly<{
        details: Readonly<{
          description: string | null;
          kind: "technical" | "diagnostic" | "other";
          result: "passed" | "failed" | "conditional" | "not-recorded";
        }>;
        type: "inspection";
      }>)
  | (ExportHistoryCommonV1 &
      Readonly<{
        details: Readonly<{
          item: string;
          manufacturer: string | null;
          partNumber: string | null;
        }>;
        type: "replacement";
      }>)
  | (ExportHistoryCommonV1 &
      Readonly<{
        details: Readonly<{
          description: string | null;
          subject: string;
        }>;
        type: "repair";
      }>);

type ExportVehicleV1 = Readonly<{
  createdAt: string;
  currentOdometerMetres: number | null;
  distanceUnitPreference: "kilometres" | "miles";
  id: string;
  initialOdometerMetres: number | null;
  make: string;
  manufactureYear: number | null;
  model: string;
  registrationNumber: string | null;
  updatedAt: string;
  variant: string | null;
  vin: string | null;
}>;

export type VehicleHistoryExportV1 = Readonly<{
  binaryFilesIncluded: false;
  data: Readonly<{
    historyEntries: readonly ExportHistoryEntryV1[];
    vehicle: ExportVehicleV1 | null;
  }>;
  exportedAt: string;
  format: typeof vehicleHistoryExportFormat;
  formatVersion: typeof vehicleHistoryExportVersion;
}>;

export type CreateVehicleHistoryExportDependencies = Readonly<{
  clock: Clock;
  historyEntryRepository: HistoryEntryRepository;
  vehicleRepository: VehicleRepository;
}>;

export async function createVehicleHistoryExport(
  dependencies: CreateVehicleHistoryExportDependencies,
): Promise<RepositoryResult<VehicleHistoryExportV1>> {
  const vehicleResult = await dependencies.vehicleRepository.get();
  if (!vehicleResult.ok) return vehicleResult;

  const vehicle = vehicleResult.value;
  if (!vehicle) {
    return {
      ok: true,
      value: buildExport(dependencies.clock, null, []),
    };
  }

  const historyResult = await dependencies.historyEntryRepository.list(vehicle.id);
  if (!historyResult.ok) return historyResult;

  return {
    ok: true,
    value: buildExport(dependencies.clock, vehicle, historyResult.value),
  };
}

export function serializeVehicleHistoryExport(value: VehicleHistoryExportV1): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildExport(
  clock: Clock,
  vehicle: Vehicle | null,
  historyEntries: readonly HistoryEntry[],
): VehicleHistoryExportV1 {
  return {
    binaryFilesIncluded: false,
    data: {
      historyEntries: historyEntries.map(mapHistoryEntry),
      vehicle: vehicle ? mapVehicle(vehicle) : null,
    },
    exportedAt: utcTimestampFromDate(clock.now()),
    format: vehicleHistoryExportFormat,
    formatVersion: vehicleHistoryExportVersion,
  };
}

function mapVehicle(vehicle: Vehicle): ExportVehicleV1 {
  return {
    createdAt: vehicle.createdAt,
    currentOdometerMetres: vehicle.currentOdometerMetres ?? null,
    distanceUnitPreference: vehicle.distanceUnitPreference,
    id: vehicle.id,
    initialOdometerMetres: vehicle.initialOdometerMetres ?? null,
    make: vehicle.make,
    manufactureYear: vehicle.manufactureYear ?? null,
    model: vehicle.model,
    registrationNumber: vehicle.registrationNumber ?? null,
    updatedAt: vehicle.updatedAt,
    variant: vehicle.variant ?? null,
    vin: vehicle.vin ?? null,
  };
}

function mapHistoryEntry(entry: HistoryEntry): ExportHistoryEntryV1 {
  const common: ExportHistoryCommonV1 = {
    cost: entry.cost ? { currency: entry.cost.currency, minorUnits: entry.cost.minorUnits } : null,
    createdAt: entry.createdAt,
    id: entry.id,
    notes: entry.notes ?? null,
    occurredAt: entry.occurredAt,
    odometerMetres: entry.odometerMetres ?? null,
    serviceProvider: entry.serviceProvider ?? null,
    updatedAt: entry.updatedAt,
    vehicleId: entry.vehicleId,
  };

  switch (entry.type) {
    case "inspection":
      return {
        ...common,
        details: {
          description: entry.details.description ?? null,
          kind: entry.details.kind,
          result: entry.details.result,
        },
        type: entry.type,
      };
    case "replacement":
      return {
        ...common,
        details: {
          item: entry.details.item,
          manufacturer: entry.details.manufacturer ?? null,
          partNumber: entry.details.partNumber ?? null,
        },
        type: entry.type,
      };
    case "repair":
      return {
        ...common,
        details: {
          description: entry.details.description ?? null,
          subject: entry.details.subject,
        },
        type: entry.type,
      };
  }
}
