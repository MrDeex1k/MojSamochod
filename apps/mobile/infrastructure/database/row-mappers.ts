import type {
  HistoryEntry,
  InspectionEntry,
  RepairEntry,
  ReplacementEntry,
} from "@/domain/history/history-entry";
import {
  fuelConsumptionUnit,
  type FuelConsumptionUnit,
} from "@/domain/refuelling/fuel-consumption";
import type { FillKind, PriceInputMode, Refuelling } from "@/domain/refuelling/refuelling";
import { positiveMicrolitres, volumeUnit } from "@/domain/refuelling/volume";
import {
  historyEntryIdFromUuidV7,
  managedFileIdFromUuidV7,
  refuellingIdFromUuidV7,
  vehicleIdFromUuidV7,
  type HistoryEntryId,
  type VehicleId,
} from "@/domain/shared/identifiers";
import type { ValidationResult } from "@/domain/shared/result";
import {
  metres,
  money,
  optionalText,
  requiredText,
  utcTimestamp,
} from "@/domain/shared/value-objects";
import type { DistanceUnit, Vehicle } from "@/domain/vehicle/vehicle";

import {
  historyEntries,
  inspectionDetails,
  repairDetails,
  refuellings,
  replacementDetails,
  vehicles,
} from "./schema";

type VehicleRow = typeof vehicles.$inferSelect;
type HistoryEntryRow = typeof historyEntries.$inferSelect;
type InspectionDetailsRow = typeof inspectionDetails.$inferSelect;
type ReplacementDetailsRow = typeof replacementDetails.$inferSelect;
type RepairDetailsRow = typeof repairDetails.$inferSelect;
type RefuellingRow = typeof refuellings.$inferSelect;

export type JoinedHistoryRow = Readonly<{
  entry: HistoryEntryRow;
  inspection: InspectionDetailsRow | null;
  repair: RepairDetailsRow | null;
  replacement: ReplacementDetailsRow | null;
}>;

export class CorruptStoredDataError extends Error {
  constructor(field: string) {
    super(`Stored data violates the domain contract at ${field}`);
    this.name = "CorruptStoredDataError";
  }
}

export function mapVehicleRow(row: VehicleRow): Vehicle {
  const make = expectValue(requiredText(row.make, "make", 80), "make");
  const model = expectValue(requiredText(row.model, "model", 80), "model");
  const variant = expectValue(optionalText(row.variant ?? undefined, "variant", 100), "variant");
  const registrationNumber = expectValue(
    optionalText(row.registrationNumber ?? undefined, "registrationNumber", 20),
    "registrationNumber",
  );
  const initialOdometerMetres = expectValue(
    metres(row.initialOdometerMetres ?? undefined, "initialOdometerMetres"),
    "initialOdometerMetres",
  );
  const currentOdometerMetres = expectValue(
    metres(row.currentOdometerMetres ?? undefined, "currentOdometerMetres"),
    "currentOdometerMetres",
  );
  const vin = row.vin ?? undefined;

  if (vin !== undefined && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    throw new CorruptStoredDataError("vin");
  }
  if (!isDistanceUnit(row.distanceUnitPreference)) {
    throw new CorruptStoredDataError("distanceUnitPreference");
  }
  const fuelConfiguration = mapFuelConfiguration(row);

  return {
    createdAt: expectValue(utcTimestamp(row.createdAt, "createdAt"), "createdAt"),
    currentOdometerMetres,
    distanceUnitPreference: row.distanceUnitPreference,
    ...fuelConfiguration,
    id: mapVehicleId(row.id, "id"),
    initialOdometerMetres,
    make,
    manufactureYear: row.manufactureYear ?? undefined,
    model,
    photoReference: row.photoReference
      ? mapManagedFileId(row.photoReference, "photoReference")
      : undefined,
    registrationNumber,
    updatedAt: expectValue(utcTimestamp(row.updatedAt, "updatedAt"), "updatedAt"),
    variant,
    vin,
  };
}

export function mapRefuellingRow(row: RefuellingRow): Refuelling {
  const pricingValues = [
    row.pricingInputMode,
    row.totalCostMinorUnits,
    row.totalCostCurrency,
    row.unitPriceMilliUnits,
    row.unitPriceVolumeUnit,
  ];
  const hasPricing = pricingValues.some((value) => value !== null);
  if (hasPricing && pricingValues.some((value) => value === null)) {
    throw new CorruptStoredDataError("pricing");
  }
  if (!isFillKind(row.fillKind)) throw new CorruptStoredDataError("fillKind");
  if (!isPriceInputModeOrNull(row.pricingInputMode)) {
    throw new CorruptStoredDataError("pricing.inputMode");
  }

  return {
    createdAt: expectValue(utcTimestamp(row.createdAt, "createdAt"), "createdAt"),
    fillKind: row.fillKind,
    id: mapRefuellingId(row.id, "id"),
    inputVolumeUnit: expectValue(volumeUnit(row.inputVolumeUnit), "inputVolumeUnit"),
    occurredAt: expectValue(utcTimestamp(row.occurredAt, "occurredAt"), "occurredAt"),
    odometerMetres: expectValue(
      metres(row.odometerMetres ?? undefined, "odometerMetres"),
      "odometerMetres",
    ),
    pricing: hasPricing
      ? {
          inputMode: row.pricingInputMode!,
          totalCost: expectPresentValue(
            money({ currency: row.totalCostCurrency!, minorUnits: row.totalCostMinorUnits! }),
            "pricing.totalCost",
          ),
          unitPriceMilliUnits: expectSafeNonNegativeInteger(
            row.unitPriceMilliUnits!,
            "pricing.unitPriceMilliUnits",
          ),
          unitPriceVolumeUnit: expectValue(
            volumeUnit(row.unitPriceVolumeUnit!, "pricing.unitPriceVolumeUnit"),
            "pricing.unitPriceVolumeUnit",
          ),
        }
      : undefined,
    quantityMicrolitres: expectValue(
      positiveMicrolitres(row.quantityMicrolitres),
      "quantityMicrolitres",
    ),
    updatedAt: expectValue(utcTimestamp(row.updatedAt, "updatedAt"), "updatedAt"),
    vehicleId: mapVehicleId(row.vehicleId, "vehicleId"),
  };
}

function mapFuelConfiguration(row: VehicleRow): {
  fuelConsumptionUnitPreference?: FuelConsumptionUnit;
  fuelTankCapacityMicrolitres?: Vehicle["fuelTankCapacityMicrolitres"];
  fuelVolumeUnitPreference?: Vehicle["fuelVolumeUnitPreference"];
} {
  const values = [
    row.fuelTankCapacityMicrolitres,
    row.fuelVolumeUnitPreference,
    row.fuelConsumptionUnitPreference,
  ];
  if (values.every((value) => value === null)) return {};
  if (values.some((value) => value === null)) {
    throw new CorruptStoredDataError("fuelConfiguration");
  }
  return {
    fuelConsumptionUnitPreference: expectValue(
      fuelConsumptionUnit(row.fuelConsumptionUnitPreference!, "fuelConsumptionUnitPreference"),
      "fuelConsumptionUnitPreference",
    ),
    fuelTankCapacityMicrolitres: expectValue(
      positiveMicrolitres(row.fuelTankCapacityMicrolitres!, "fuelTankCapacityMicrolitres"),
      "fuelTankCapacityMicrolitres",
    ),
    fuelVolumeUnitPreference: expectValue(
      volumeUnit(row.fuelVolumeUnitPreference!, "fuelVolumeUnitPreference"),
      "fuelVolumeUnitPreference",
    ),
  };
}

export function mapHistoryRow(row: JoinedHistoryRow): HistoryEntry {
  const common = mapHistoryCommon(row.entry);

  switch (row.entry.type) {
    case "inspection": {
      if (!row.inspection || row.replacement || row.repair) {
        throw new CorruptStoredDataError("inspectionDetails");
      }
      if (!isInspectionKind(row.inspection.kind) || !isInspectionResult(row.inspection.result)) {
        throw new CorruptStoredDataError("inspectionDetails");
      }
      const entry: InspectionEntry = {
        ...common,
        details: {
          description: expectValue(
            optionalText(row.inspection.description ?? undefined, "details.description", 200),
            "details.description",
          ),
          kind: row.inspection.kind,
          result: row.inspection.result,
        },
        type: "inspection",
      };
      return entry;
    }
    case "replacement": {
      if (!row.replacement || row.inspection || row.repair) {
        throw new CorruptStoredDataError("replacementDetails");
      }
      const entry: ReplacementEntry = {
        ...common,
        details: {
          item: expectValue(
            requiredText(row.replacement.item, "details.item", 120),
            "details.item",
          ),
          manufacturer: expectValue(
            optionalText(row.replacement.manufacturer ?? undefined, "details.manufacturer", 100),
            "details.manufacturer",
          ),
          partNumber: expectValue(
            optionalText(row.replacement.partNumber ?? undefined, "details.partNumber", 100),
            "details.partNumber",
          ),
        },
        type: "replacement",
      };
      return entry;
    }
    case "repair": {
      if (!row.repair || row.inspection || row.replacement) {
        throw new CorruptStoredDataError("repairDetails");
      }
      const entry: RepairEntry = {
        ...common,
        details: {
          description: expectValue(
            optionalText(row.repair.description ?? undefined, "details.description", 500),
            "details.description",
          ),
          subject: expectValue(
            requiredText(row.repair.subject, "details.subject", 120),
            "details.subject",
          ),
        },
        type: "repair",
      };
      return entry;
    }
    default:
      throw new CorruptStoredDataError("type");
  }
}

function mapHistoryCommon(row: HistoryEntryRow) {
  const hasCost = row.costMinorUnits !== null || row.costCurrency !== null;
  if (hasCost && (row.costMinorUnits === null || row.costCurrency === null)) {
    throw new CorruptStoredDataError("cost");
  }

  return {
    cost: expectValue(
      money(hasCost ? { currency: row.costCurrency!, minorUnits: row.costMinorUnits! } : undefined),
      "cost",
    ),
    createdAt: expectValue(utcTimestamp(row.createdAt, "createdAt"), "createdAt"),
    id: mapHistoryEntryId(row.id, "id"),
    notes: expectValue(optionalText(row.notes ?? undefined, "notes", 5000), "notes"),
    occurredAt: expectValue(utcTimestamp(row.occurredAt, "occurredAt"), "occurredAt"),
    odometerMetres: expectValue(
      metres(row.odometerMetres ?? undefined, "odometerMetres"),
      "odometerMetres",
    ),
    serviceProvider: expectValue(
      optionalText(row.serviceProvider ?? undefined, "serviceProvider", 120),
      "serviceProvider",
    ),
    updatedAt: expectValue(utcTimestamp(row.updatedAt, "updatedAt"), "updatedAt"),
    vehicleId: mapVehicleId(row.vehicleId, "vehicleId"),
  };
}

function expectValue<T>(result: ValidationResult<T>, field: string): T {
  if (!result.ok) {
    throw new CorruptStoredDataError(field);
  }

  return result.value;
}

function expectPresentValue<T>(result: ValidationResult<T | undefined>, field: string): T {
  const value = expectValue(result, field);
  if (value === undefined) throw new CorruptStoredDataError(field);
  return value;
}

function mapVehicleId(value: string, field: string): VehicleId {
  try {
    return vehicleIdFromUuidV7(value);
  } catch {
    throw new CorruptStoredDataError(field);
  }
}

function mapHistoryEntryId(value: string, field: string): HistoryEntryId {
  try {
    return historyEntryIdFromUuidV7(value);
  } catch {
    throw new CorruptStoredDataError(field);
  }
}

function mapRefuellingId(value: string, field: string) {
  try {
    return refuellingIdFromUuidV7(value);
  } catch {
    throw new CorruptStoredDataError(field);
  }
}

function mapManagedFileId(value: string, field: string) {
  try {
    return managedFileIdFromUuidV7(value);
  } catch {
    throw new CorruptStoredDataError(field);
  }
}

function isDistanceUnit(value: string): value is DistanceUnit {
  return value === "kilometres" || value === "miles";
}

function isInspectionKind(value: string): value is InspectionEntry["details"]["kind"] {
  return value === "technical" || value === "diagnostic" || value === "other";
}

function isInspectionResult(value: string): value is InspectionEntry["details"]["result"] {
  return (
    value === "passed" || value === "failed" || value === "conditional" || value === "not-recorded"
  );
}

function isFillKind(value: string): value is FillKind {
  return value === "full" || value === "partial";
}

function isPriceInputModeOrNull(value: string | null): value is PriceInputMode | null {
  return value === null || value === "total" || value === "perVolumeUnit";
}

function expectSafeNonNegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new CorruptStoredDataError(field);
  return value;
}
