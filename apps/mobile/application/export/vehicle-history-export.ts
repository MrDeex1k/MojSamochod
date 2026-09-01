import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { RefuellingRepository } from "@/application/repositories/refuelling-repository";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileRepository } from "@/application/repositories/managed-file-repository";
import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import { repositoryFailure } from "@/application/repositories/repository-result";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { ReadyManagedFileMetadata } from "@/domain/files/managed-file";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestampFromDate } from "@/domain/shared/value-objects";
import type { Vehicle } from "@/domain/vehicle/vehicle";

export const vehicleHistoryExportFormat = "moje-auto-vehicle-history";
export const vehicleHistoryExportVersion = 3;

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

type ExportVehicleV3 = Readonly<{
  createdAt: string;
  currentOdometerMetres: number | null;
  distanceUnitPreference: "kilometres" | "miles";
  fuelConsumptionUnitPreference:
    | "litresPer100Kilometres"
    | "milesPerUsGallon"
    | "milesPerImperialGallon"
    | null;
  fuelTankCapacityMicrolitres: number | null;
  fuelVolumeUnitPreference: "litres" | "usGallons" | "imperialGallons" | null;
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

type ExportDocumentV2 = Readonly<{
  amount: ExportMoneyV1 | null;
  createdAt: string;
  documentDate: string | null;
  file: Readonly<{
    byteSize: number;
    mimeType: string;
    originalName: string;
    sha256: string;
  }>;
  historyEntryId: string | null;
  id: string;
  name: string;
  notes: string | null;
  updatedAt: string;
  vehicleId: string;
}>;

type ExportRefuellingV3 = Readonly<{
  createdAt: string;
  fillKind: "full" | "partial";
  id: string;
  inputVolumeUnit: "litres" | "usGallons" | "imperialGallons";
  occurredAt: string;
  odometerMetres: number | null;
  pricing: Readonly<{
    inputMode: "total" | "perVolumeUnit";
    totalCost: ExportMoneyV1;
    unitPriceMilliUnits: number;
    unitPriceVolumeUnit: "litres" | "usGallons" | "imperialGallons";
  }> | null;
  quantityMicrolitres: number;
  updatedAt: string;
  vehicleId: string;
}>;

export type VehicleHistoryExportV3 = Readonly<{
  binaryFilesIncluded: false;
  data: Readonly<{
    documents: readonly ExportDocumentV2[];
    historyEntries: readonly ExportHistoryEntryV1[];
    refuellings: readonly ExportRefuellingV3[];
    vehicle: ExportVehicleV3 | null;
  }>;
  exportedAt: string;
  format: typeof vehicleHistoryExportFormat;
  formatVersion: typeof vehicleHistoryExportVersion;
}>;

export type CreateVehicleHistoryExportDependencies = Readonly<{
  clock: Clock;
  historyEntryRepository: HistoryEntryRepository;
  managedFileRepository: ManagedFileRepository;
  refuellingRepository: RefuellingRepository;
  vehicleDocumentRepository: VehicleDocumentRepository;
  vehicleRepository: VehicleRepository;
}>;

export async function createVehicleHistoryExport(
  dependencies: CreateVehicleHistoryExportDependencies,
): Promise<RepositoryResult<VehicleHistoryExportV3>> {
  const vehicleResult = await dependencies.vehicleRepository.get();
  if (!vehicleResult.ok) return vehicleResult;

  const vehicle = vehicleResult.value;
  if (!vehicle) {
    return {
      ok: true,
      value: buildExport(dependencies.clock, null, [], [], []),
    };
  }

  const historyResult = await dependencies.historyEntryRepository.list(vehicle.id);
  if (!historyResult.ok) return historyResult;

  const refuellingsResult = await dependencies.refuellingRepository.list(vehicle.id);
  if (!refuellingsResult.ok) return refuellingsResult;

  const documentsResult = await dependencies.vehicleDocumentRepository.list(vehicle.id);
  if (!documentsResult.ok) return documentsResult;
  const exportedDocuments: ExportDocumentV2[] = [];
  for (const document of documentsResult.value) {
    const file = await dependencies.managedFileRepository.getReady(document.fileReference);
    if (!file.ok) return file;
    if (!file.value) {
      return repositoryFailure("corrupt-data", "vehicleHistoryExport.documentFile");
    }
    exportedDocuments.push(mapDocument(document, file.value));
  }

  return {
    ok: true,
    value: buildExport(
      dependencies.clock,
      vehicle,
      historyResult.value,
      exportedDocuments,
      refuellingsResult.value,
    ),
  };
}

export function serializeVehicleHistoryExport(value: VehicleHistoryExportV3): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildExport(
  clock: Clock,
  vehicle: Vehicle | null,
  historyEntries: readonly HistoryEntry[],
  documents: readonly ExportDocumentV2[],
  refuellings: readonly Refuelling[],
): VehicleHistoryExportV3 {
  return {
    binaryFilesIncluded: false,
    data: {
      documents,
      historyEntries: historyEntries.map(mapHistoryEntry),
      refuellings: refuellings.map(mapRefuelling),
      vehicle: vehicle ? mapVehicle(vehicle) : null,
    },
    exportedAt: utcTimestampFromDate(clock.now()),
    format: vehicleHistoryExportFormat,
    formatVersion: vehicleHistoryExportVersion,
  };
}

function mapDocument(document: VehicleDocument, file: ReadyManagedFileMetadata): ExportDocumentV2 {
  return {
    amount: document.amount
      ? { currency: document.amount.currency, minorUnits: document.amount.minorUnits }
      : null,
    createdAt: document.createdAt,
    documentDate: document.documentDate ?? null,
    file: {
      byteSize: file.byteSize,
      mimeType: file.mimeType,
      originalName: file.originalName,
      sha256: file.sha256,
    },
    historyEntryId: document.historyEntryId ?? null,
    id: document.id,
    name: document.name,
    notes: document.notes ?? null,
    updatedAt: document.updatedAt,
    vehicleId: document.vehicleId,
  };
}

function mapVehicle(vehicle: Vehicle): ExportVehicleV3 {
  return {
    createdAt: vehicle.createdAt,
    currentOdometerMetres: vehicle.currentOdometerMetres ?? null,
    distanceUnitPreference: vehicle.distanceUnitPreference,
    fuelConsumptionUnitPreference: vehicle.fuelConsumptionUnitPreference ?? null,
    fuelTankCapacityMicrolitres: vehicle.fuelTankCapacityMicrolitres ?? null,
    fuelVolumeUnitPreference: vehicle.fuelVolumeUnitPreference ?? null,
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

function mapRefuelling(refuelling: Refuelling): ExportRefuellingV3 {
  return {
    createdAt: refuelling.createdAt,
    fillKind: refuelling.fillKind,
    id: refuelling.id,
    inputVolumeUnit: refuelling.inputVolumeUnit,
    occurredAt: refuelling.occurredAt,
    odometerMetres: refuelling.odometerMetres ?? null,
    pricing: refuelling.pricing
      ? {
          inputMode: refuelling.pricing.inputMode,
          totalCost: {
            currency: refuelling.pricing.totalCost.currency,
            minorUnits: refuelling.pricing.totalCost.minorUnits,
          },
          unitPriceMilliUnits: refuelling.pricing.unitPriceMilliUnits,
          unitPriceVolumeUnit: refuelling.pricing.unitPriceVolumeUnit,
        }
      : null,
    quantityMicrolitres: refuelling.quantityMicrolitres,
    updatedAt: refuelling.updatedAt,
    vehicleId: refuelling.vehicleId,
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
