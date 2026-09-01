import { money, type MoneyInput } from "../shared/value-objects";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import type { RefuellingPricingInput } from "./refuelling";
import {
  microlitresPerVolumeUnit,
  positiveMicrolitres,
  volumeUnit,
  type VolumeUnit,
} from "./volume";

export function parseUnitPriceMilliUnits(
  value: string,
  field = "unitPrice",
): ValidationResult<number> {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(value.trim());
  if (!match) return invalid([{ code: "invalid-format", field }]);
  const milliUnits = Number(match[1]) * 1_000 + Number((match[2] ?? "").padEnd(3, "0"));
  return Number.isSafeInteger(milliUnits)
    ? valid(milliUnits)
    : invalid([{ code: "out-of-range", field }]);
}

export function convertUnitPriceMilliUnits(
  value: number,
  fromUnit: VolumeUnit,
  toUnit: VolumeUnit,
): number | undefined {
  if (!Number.isSafeInteger(value) || value < 0) return undefined;
  const [fromNumerator, fromDenominator] = microlitresPerVolumeUnit(fromUnit);
  const [toNumerator, toDenominator] = microlitresPerVolumeUnit(toUnit);
  return roundedSafeInteger(
    BigInt(value) * toNumerator * fromDenominator,
    fromNumerator * toDenominator,
  );
}

export function pricingFromUnitPrice(input: {
  currency: string;
  currencyFractionDigits: number;
  quantityMicrolitres: number;
  unitPriceMilliUnits: number;
  unitPriceVolumeUnit: string;
}): ValidationResult<RefuellingPricingInput> {
  const issues: ValidationIssue[] = [];
  const quantity = collect(positiveMicrolitres(input.quantityMicrolitres), issues);
  const unit = collect(volumeUnit(input.unitPriceVolumeUnit, "unitPriceVolumeUnit"), issues);
  validateUnitPrice(input.unitPriceMilliUnits, issues);
  const currencyScale = validateCurrency(input.currency, input.currencyFractionDigits, issues);
  if (issues.length > 0) return invalid(issues);

  const totalCostMinorUnits = deriveTotalCostMinorUnits(
    quantity!,
    unit!,
    input.unitPriceMilliUnits,
    currencyScale!,
  );
  if (totalCostMinorUnits === undefined) {
    return invalid([{ code: "out-of-range", field: "totalCost.minorUnits" }]);
  }
  return valid({
    inputMode: "perVolumeUnit",
    totalCost: { currency: input.currency, minorUnits: totalCostMinorUnits },
    unitPriceMilliUnits: input.unitPriceMilliUnits,
    unitPriceVolumeUnit: unit!,
  });
}

export function pricingFromTotalCost(input: {
  currencyFractionDigits: number;
  quantityMicrolitres: number;
  totalCost: MoneyInput;
  unitPriceVolumeUnit: string;
}): ValidationResult<RefuellingPricingInput> {
  const issues: ValidationIssue[] = [];
  const quantity = collect(positiveMicrolitres(input.quantityMicrolitres), issues);
  const unit = collect(volumeUnit(input.unitPriceVolumeUnit, "unitPriceVolumeUnit"), issues);
  const totalCost = collect(money(input.totalCost, "totalCost"), issues);
  const currencyScale = validateCurrency(
    input.totalCost.currency,
    input.currencyFractionDigits,
    issues,
  );
  if (issues.length > 0) return invalid(issues);

  const unitPriceMilliUnits = deriveUnitPriceMilliUnits(
    totalCost!.minorUnits,
    quantity!,
    unit!,
    currencyScale!,
  );
  if (unitPriceMilliUnits === undefined) {
    return invalid([{ code: "out-of-range", field: "unitPriceMilliUnits" }]);
  }
  return valid({
    inputMode: "total",
    totalCost: input.totalCost,
    unitPriceMilliUnits,
    unitPriceVolumeUnit: unit!,
  });
}

function deriveTotalCostMinorUnits(
  quantityMicrolitres: number,
  unit: VolumeUnit,
  unitPriceMilliUnits: number,
  currencyScale: number,
): number | undefined {
  const [unitMicrolitreNumerator, unitMicrolitreDenominator] = microlitresPerVolumeUnit(unit);
  return roundedSafeInteger(
    BigInt(unitPriceMilliUnits) *
      BigInt(quantityMicrolitres) *
      BigInt(currencyScale) *
      unitMicrolitreDenominator,
    1_000n * unitMicrolitreNumerator,
  );
}

function deriveUnitPriceMilliUnits(
  totalCostMinorUnits: number,
  quantityMicrolitres: number,
  unit: VolumeUnit,
  currencyScale: number,
): number | undefined {
  const [unitMicrolitreNumerator, unitMicrolitreDenominator] = microlitresPerVolumeUnit(unit);
  return roundedSafeInteger(
    BigInt(totalCostMinorUnits) * 1_000n * unitMicrolitreNumerator,
    BigInt(currencyScale) * BigInt(quantityMicrolitres) * unitMicrolitreDenominator,
  );
}

function validateCurrency(
  currency: string,
  fractionDigits: number,
  issues: ValidationIssue[],
): number | undefined {
  if (!/^[A-Z]{3}$/.test(currency)) {
    issues.push({ code: "invalid-format", field: "currency" });
  }
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 3) {
    issues.push({ code: "out-of-range", field: "currencyFractionDigits" });
    return undefined;
  }
  return 10 ** fractionDigits;
}

function validateUnitPrice(value: number, issues: ValidationIssue[]): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    issues.push({ code: "out-of-range", field: "unitPriceMilliUnits" });
  }
}

function roundedSafeInteger(numerator: bigint, denominator: bigint): number | undefined {
  const value = (numerator + denominator / 2n) / denominator;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : undefined;
}

function collect<T>(result: ValidationResult<T>, issues: ValidationIssue[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}
