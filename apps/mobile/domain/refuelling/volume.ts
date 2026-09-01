import { invalid, valid, type ValidationResult } from "../shared/result";

declare const microlitresBrand: unique symbol;

export type Microlitres = number & { readonly [microlitresBrand]: true };
export type VolumeUnit = "litres" | "usGallons" | "imperialGallons";

const maximumDecimalPlaces = 6;
const microlitresPerLitre = 1_000_000n;
const microlitresPerImperialGallon = 4_546_090n;
const usGallonMicrolitreNumerator = 3_785_411_784n;
const usGallonMicrolitreDenominator = 1_000n;

export function positiveMicrolitres(
  value: number,
  field = "quantityMicrolitres",
): ValidationResult<Microlitres> {
  return Number.isSafeInteger(value) && value > 0
    ? valid(value as Microlitres)
    : invalid([{ code: "out-of-range", field }]);
}

export function volumeUnit(value: string, field = "inputVolumeUnit"): ValidationResult<VolumeUnit> {
  return value === "litres" || value === "usGallons" || value === "imperialGallons"
    ? valid(value)
    : invalid([{ code: "invalid-format", field }]);
}

export function parseVolumeToMicrolitres(
  value: string,
  unit: string,
  field = "quantity",
): ValidationResult<Microlitres> {
  const validatedUnit = volumeUnit(unit, `${field}.unit`);
  const normalized = value.trim();
  const match = new RegExp(`^(\\d+)(?:\\.(\\d{1,${maximumDecimalPlaces}}))?$`).exec(normalized);
  if (!match) return invalid([{ code: "invalid-format", field: `${field}.value` }]);
  if (!validatedUnit.ok) return validatedUnit;

  const fraction = match[2] ?? "";
  const scale = 10n ** BigInt(fraction.length);
  const decimalNumerator = BigInt(match[1]) * scale + BigInt(fraction || "0");
  const [unitNumerator, unitDenominator] = microlitresPerVolumeUnit(validatedUnit.value);
  const converted = divideRoundedHalfUp(decimalNumerator * unitNumerator, scale * unitDenominator);
  const numeric = Number(converted);
  return positiveMicrolitres(numeric, `${field}.value`);
}

export function microlitresToVolume(value: Microlitres, unit: VolumeUnit): number {
  switch (unit) {
    case "litres":
      return value / Number(microlitresPerLitre);
    case "usGallons":
      return (value * Number(usGallonMicrolitreDenominator)) / Number(usGallonMicrolitreNumerator);
    case "imperialGallons":
      return value / Number(microlitresPerImperialGallon);
  }
}

export function microlitresPerVolumeUnit(unit: VolumeUnit): readonly [bigint, bigint] {
  switch (unit) {
    case "litres":
      return [microlitresPerLitre, 1n];
    case "usGallons":
      return [usGallonMicrolitreNumerator, usGallonMicrolitreDenominator];
    case "imperialGallons":
      return [microlitresPerImperialGallon, 1n];
  }
}

function divideRoundedHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}
