import { vehicleIdFromUuidV7, type ManagedFileId, type VehicleId } from "../shared/identifiers";
import { fuelConsumptionUnit, type FuelConsumptionUnit } from "../refuelling/fuel-consumption";
import {
  positiveMicrolitres,
  volumeUnit,
  type Microlitres,
  type VolumeUnit,
} from "../refuelling/volume";
import type { Clock, IdGenerator } from "../shared/ports";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import {
  metres,
  optionalText,
  requiredText,
  utcTimestampFromDate,
  type Metres,
  type UtcTimestamp,
} from "../shared/value-objects";

export type DistanceUnit = "kilometres" | "miles";

export type Vehicle = Readonly<{
  createdAt: UtcTimestamp;
  currentOdometerMetres?: Metres;
  distanceUnitPreference: DistanceUnit;
  fuelConsumptionUnitPreference?: FuelConsumptionUnit;
  fuelTankCapacityMicrolitres?: Microlitres;
  fuelVolumeUnitPreference?: VolumeUnit;
  id: VehicleId;
  initialOdometerMetres?: Metres;
  make: string;
  manufactureYear?: number;
  model: string;
  photoReference?: ManagedFileId;
  registrationNumber?: string;
  updatedAt: UtcTimestamp;
  variant?: string;
  vin?: string;
}>;

export type FuelConfiguredVehicle = Vehicle &
  Readonly<
    Required<
      Pick<
        Vehicle,
        "fuelConsumptionUnitPreference" | "fuelTankCapacityMicrolitres" | "fuelVolumeUnitPreference"
      >
    >
  >;

export function hasFuelConfiguration(vehicle: Vehicle): vehicle is FuelConfiguredVehicle {
  return (
    vehicle.fuelConsumptionUnitPreference !== undefined &&
    vehicle.fuelTankCapacityMicrolitres !== undefined &&
    vehicle.fuelVolumeUnitPreference !== undefined
  );
}

export type CreateVehicleInput = Readonly<{
  distanceUnitPreference: string;
  fuelConsumptionUnitPreference: string;
  fuelTankCapacityMicrolitres: number;
  fuelVolumeUnitPreference: string;
  initialOdometerMetres?: number;
  make: string;
  manufactureYear?: number;
  model: string;
  photoReference?: ManagedFileId;
  registrationNumber?: string;
  variant?: string;
  vin?: string;
}>;

export type CreateVehicleDependencies = Readonly<{
  clock: Clock;
  idGenerator: IdGenerator;
}>;

export function createVehicle(
  input: CreateVehicleInput,
  dependencies: CreateVehicleDependencies,
): ValidationResult<FuelConfiguredVehicle> {
  const now = dependencies.clock.now();
  const issues: ValidationIssue[] = [];
  const make = collect(requiredText(input.make, "make", 80), issues);
  const model = collect(requiredText(input.model, "model", 80), issues);
  const variant = collect(optionalText(input.variant, "variant", 100), issues);
  const registrationNumber = collect(
    optionalText(input.registrationNumber, "registrationNumber", 20),
    issues,
  );
  const initialOdometerMetres = collect(
    metres(input.initialOdometerMetres, "initialOdometerMetres"),
    issues,
  );
  const vin = validateVin(input.vin, issues);
  const manufactureYear = validateManufactureYear(input.manufactureYear, now, issues);
  const distanceUnitPreference = validateDistanceUnit(input.distanceUnitPreference, issues);
  const fuelTankCapacityMicrolitres = collect(
    positiveMicrolitres(input.fuelTankCapacityMicrolitres, "fuelTankCapacityMicrolitres"),
    issues,
  );
  const fuelVolumeUnitPreference = collect(
    volumeUnit(input.fuelVolumeUnitPreference, "fuelVolumeUnitPreference"),
    issues,
  );
  const fuelConsumptionUnitPreference = collect(
    fuelConsumptionUnit(input.fuelConsumptionUnitPreference, "fuelConsumptionUnitPreference"),
    issues,
  );

  if (issues.length > 0) {
    return invalid(issues);
  }

  const timestamp = utcTimestampFromDate(now);

  return valid({
    createdAt: timestamp,
    currentOdometerMetres: initialOdometerMetres,
    distanceUnitPreference: distanceUnitPreference!,
    fuelConsumptionUnitPreference: fuelConsumptionUnitPreference!,
    fuelTankCapacityMicrolitres: fuelTankCapacityMicrolitres!,
    fuelVolumeUnitPreference: fuelVolumeUnitPreference!,
    id: vehicleIdFromUuidV7(dependencies.idGenerator.generate()),
    initialOdometerMetres,
    make: make!,
    manufactureYear,
    model: model!,
    photoReference: input.photoReference,
    registrationNumber,
    updatedAt: timestamp,
    variant,
    vin,
  });
}

export function updateVehicle(
  existing: Vehicle,
  input: CreateVehicleInput,
  clock: Clock,
): ValidationResult<FuelConfiguredVehicle> {
  const validated = createVehicle(input, {
    clock,
    idGenerator: { generate: () => existing.id },
  });
  return validated.ok
    ? valid({
        ...validated.value,
        createdAt: existing.createdAt,
        currentOdometerMetres: existing.currentOdometerMetres,
        id: existing.id,
      })
    : validated;
}

function collect<T>(result: ValidationResult<T>, issues: ValidationIssue[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }

  return result.value;
}

function validateDistanceUnit(value: string, issues: ValidationIssue[]): DistanceUnit | undefined {
  if (value !== "kilometres" && value !== "miles") {
    issues.push({ code: "invalid-format", field: "distanceUnitPreference" });
    return undefined;
  }

  return value;
}

function validateManufactureYear(
  value: number | undefined,
  now: Date,
  issues: ValidationIssue[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const maximumYear = now.getUTCFullYear() + 1;
  if (!Number.isInteger(value) || value < 1000 || value > maximumYear) {
    issues.push({ code: "out-of-range", field: "manufactureYear" });
    return undefined;
  }

  return value;
}

function validateVin(value: string | undefined, issues: ValidationIssue[]): string | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return undefined;
  }

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
    issues.push({ code: "invalid-format", field: "vin" });
    return undefined;
  }

  return normalized;
}
