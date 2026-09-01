import type { DistanceUnit } from "./vehicle";

const metresPerKilometre = 1_000;
const metresPerMile = 1_609.344;

export function distanceToMetres(value: number, unit: DistanceUnit): number {
  return Math.round(value * metresPerUnit(unit));
}

export function metresToDistance(value: number, unit: DistanceUnit): number {
  return value / metresPerUnit(unit);
}

export function distanceUnitLabel(unit: DistanceUnit): "km" | "mi" {
  return unit === "kilometres" ? "km" : "mi";
}

function metresPerUnit(unit: DistanceUnit): number {
  return unit === "kilometres" ? metresPerKilometre : metresPerMile;
}
