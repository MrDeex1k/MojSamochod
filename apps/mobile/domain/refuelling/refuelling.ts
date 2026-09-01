import { refuellingIdFromUuidV7, type RefuellingId, type VehicleId } from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import {
  metres,
  money,
  utcTimestamp,
  utcTimestampFromDate,
  type Metres,
  type Money,
  type MoneyInput,
  type UtcTimestamp,
} from "../shared/value-objects";
import { positiveMicrolitres, volumeUnit, type Microlitres, type VolumeUnit } from "./volume";

export type FillKind = "full" | "partial";
export type PriceInputMode = "total" | "perVolumeUnit";

export type RefuellingPricing = Readonly<{
  inputMode: PriceInputMode;
  totalCost: Money;
  unitPriceMilliUnits: number;
  unitPriceVolumeUnit: VolumeUnit;
}>;

export type Refuelling = Readonly<{
  createdAt: UtcTimestamp;
  fillKind: FillKind;
  id: RefuellingId;
  inputVolumeUnit: VolumeUnit;
  occurredAt: UtcTimestamp;
  odometerMetres?: Metres;
  pricing?: RefuellingPricing;
  quantityMicrolitres: Microlitres;
  updatedAt: UtcTimestamp;
  vehicleId: VehicleId;
}>;

export type RefuellingPricingInput = Readonly<{
  inputMode: string;
  totalCost: MoneyInput;
  unitPriceMilliUnits: number;
  unitPriceVolumeUnit: string;
}>;

export type CreateRefuellingInput = Readonly<{
  fillKind: string;
  inputVolumeUnit: string;
  occurredAt: string;
  odometerMetres?: number;
  pricing?: RefuellingPricingInput;
  quantityMicrolitres: number;
  vehicleId: VehicleId;
}>;

export function createRefuelling(
  input: CreateRefuellingInput,
  dependencies: Readonly<{ clock: Clock; idGenerator: IdGenerator }>,
): ValidationResult<Refuelling> {
  const now = dependencies.clock.now();
  const validated = validateRefuellingInput(input, now);
  if (!validated.ok) return validated;

  const timestamp = utcTimestampFromDate(now);
  return valid({
    ...validated.value,
    createdAt: timestamp,
    id: refuellingIdFromUuidV7(dependencies.idGenerator.generate()),
    updatedAt: timestamp,
  });
}

export function updateRefuelling(
  existing: Refuelling,
  input: CreateRefuellingInput,
  clock: Clock,
): ValidationResult<Refuelling> {
  const now = clock.now();
  const validated = validateRefuellingInput(input, now);
  return validated.ok
    ? valid({
        ...validated.value,
        createdAt: existing.createdAt,
        id: existing.id,
        updatedAt: utcTimestampFromDate(now),
        vehicleId: existing.vehicleId,
      })
    : validated;
}

export function compareRefuellingsOldestFirst(left: Refuelling, right: Refuelling): number {
  return (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function validateRefuellingInput(
  input: CreateRefuellingInput,
  now: Date,
): ValidationResult<Omit<Refuelling, "createdAt" | "id" | "updatedAt">> {
  const issues: ValidationIssue[] = [];
  const occurredAt = collect(utcTimestamp(input.occurredAt, "occurredAt"), issues);
  const odometerMetres = collect(metres(input.odometerMetres, "odometerMetres"), issues);
  const quantityMicrolitres = collect(positiveMicrolitres(input.quantityMicrolitres), issues);
  const inputVolumeUnit = collect(volumeUnit(input.inputVolumeUnit), issues);
  const fillKind = validateFillKind(input.fillKind, issues);
  const pricing = validatePricing(input.pricing, issues);

  if (occurredAt && Date.parse(occurredAt) > now.getTime()) {
    issues.push({ code: "future", field: "occurredAt" });
  }

  return issues.length > 0
    ? invalid(issues)
    : valid({
        fillKind: fillKind!,
        inputVolumeUnit: inputVolumeUnit!,
        occurredAt: occurredAt!,
        odometerMetres,
        pricing,
        quantityMicrolitres: quantityMicrolitres!,
        vehicleId: input.vehicleId,
      });
}

function validateFillKind(value: string, issues: ValidationIssue[]): FillKind | undefined {
  if (value !== "full" && value !== "partial") {
    issues.push({ code: "invalid-format", field: "fillKind" });
    return undefined;
  }
  return value;
}

function validatePricing(
  input: RefuellingPricingInput | undefined,
  issues: ValidationIssue[],
): RefuellingPricing | undefined {
  if (!input) return undefined;
  const issueCount = issues.length;
  const totalCost = collect(money(input.totalCost, "pricing.totalCost"), issues);
  const unitPriceVolumeUnit = collect(
    volumeUnit(input.unitPriceVolumeUnit, "pricing.unitPriceVolumeUnit"),
    issues,
  );
  const inputMode = validatePriceInputMode(input.inputMode, issues);
  if (!Number.isSafeInteger(input.unitPriceMilliUnits) || input.unitPriceMilliUnits < 0) {
    issues.push({ code: "out-of-range", field: "pricing.unitPriceMilliUnits" });
  }
  if (issues.length > issueCount) return undefined;
  return {
    inputMode: inputMode!,
    totalCost: totalCost!,
    unitPriceMilliUnits: input.unitPriceMilliUnits,
    unitPriceVolumeUnit: unitPriceVolumeUnit!,
  };
}

function validatePriceInputMode(
  value: string,
  issues: ValidationIssue[],
): PriceInputMode | undefined {
  if (value !== "total" && value !== "perVolumeUnit") {
    issues.push({ code: "invalid-format", field: "pricing.inputMode" });
    return undefined;
  }
  return value;
}

function collect<T>(result: ValidationResult<T>, issues: ValidationIssue[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}
