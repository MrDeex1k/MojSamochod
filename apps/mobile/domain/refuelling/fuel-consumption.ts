import type { RefuellingId } from "../shared/identifiers";
import type { Refuelling } from "./refuelling";
import { compareRefuellingsOldestFirst } from "./refuelling";

export type FuelConsumptionUnit =
  | "litresPer100Kilometres"
  | "milesPerUsGallon"
  | "milesPerImperialGallon";

export type InvalidFuelIntervalReason =
  | "decreasing-odometer"
  | "missing-end-odometer"
  | "missing-start-odometer"
  | "mixed-vehicles"
  | "non-positive-distance"
  | "unsafe-total";

export type ValidFuelInterval = Readonly<{
  distanceMetres: number;
  endRefuellingId: RefuellingId;
  fuelMicrolitres: number;
  refuellingIds: readonly RefuellingId[];
  startRefuellingId: RefuellingId;
  status: "valid";
}>;

export type InvalidFuelInterval = Readonly<{
  endRefuellingId: RefuellingId;
  reason: InvalidFuelIntervalReason;
  refuellingIds: readonly RefuellingId[];
  startRefuellingId: RefuellingId;
  status: "invalid";
}>;

export type FuelInterval = InvalidFuelInterval | ValidFuelInterval;

export type PendingFuelInterval = Readonly<{
  reason: "awaiting-full-tank";
  refuellingIds: readonly RefuellingId[];
  startRefuellingId: RefuellingId;
}>;

export type FuelConsumptionSummary = Readonly<{
  includedRefuellingIds: readonly RefuellingId[];
  intervals: readonly FuelInterval[];
  pendingInterval?: PendingFuelInterval;
  totalDistanceMetres: number;
  totalFuelMicrolitres: number;
  unanchoredRefuellingIds: readonly RefuellingId[];
}>;

export function calculateFuelConsumption(
  refuellings: readonly Refuelling[],
): FuelConsumptionSummary {
  const sorted = [...refuellings].sort(compareRefuellingsOldestFirst);
  const firstFullIndex = sorted.findIndex(({ fillKind }) => fillKind === "full");
  if (firstFullIndex < 0) {
    return emptySummary(sorted.map(({ id }) => id));
  }

  const intervals: FuelInterval[] = [];
  let anchorIndex = firstFullIndex;
  for (let index = firstFullIndex + 1; index < sorted.length; index += 1) {
    if (sorted[index].fillKind !== "full") continue;
    intervals.push(createInterval(sorted.slice(anchorIndex, index + 1)));
    anchorIndex = index;
  }

  const validIntervals = intervals.filter(
    (interval): interval is ValidFuelInterval => interval.status === "valid",
  );
  const totalDistanceMetres = safeSum(validIntervals.map(({ distanceMetres }) => distanceMetres));
  const totalFuelMicrolitres = safeSum(
    validIntervals.map(({ fuelMicrolitres }) => fuelMicrolitres),
  );
  const includedRefuellingIds = [
    ...new Set(validIntervals.flatMap(({ refuellingIds }) => refuellingIds)),
  ];
  const pendingRefuellings = sorted.slice(anchorIndex);

  return {
    includedRefuellingIds,
    intervals,
    pendingInterval: {
      reason: "awaiting-full-tank",
      refuellingIds: pendingRefuellings.map(({ id }) => id),
      startRefuellingId: pendingRefuellings[0].id,
    },
    totalDistanceMetres: totalDistanceMetres ?? 0,
    totalFuelMicrolitres: totalFuelMicrolitres ?? 0,
    unanchoredRefuellingIds: sorted.slice(0, firstFullIndex).map(({ id }) => id),
  };
}

export function fuelConsumptionValue(
  summary: FuelConsumptionSummary,
  unit: FuelConsumptionUnit,
): number | undefined {
  const { totalDistanceMetres, totalFuelMicrolitres } = summary;
  if (totalDistanceMetres <= 0 || totalFuelMicrolitres <= 0) return undefined;
  switch (unit) {
    case "litresPer100Kilometres":
      return totalFuelMicrolitres / (totalDistanceMetres * 10);
    case "milesPerUsGallon":
      return totalDistanceMetres / 1609.344 / (totalFuelMicrolitres / 3_785_411.784);
    case "milesPerImperialGallon":
      return totalDistanceMetres / 1609.344 / (totalFuelMicrolitres / 4_546_090);
  }
}

function createInterval(refuellings: readonly Refuelling[]): FuelInterval {
  const start = refuellings[0];
  const end = refuellings.at(-1)!;
  const common = {
    endRefuellingId: end.id,
    refuellingIds: refuellings.map(({ id }) => id),
    startRefuellingId: start.id,
  };
  if (refuellings.some(({ vehicleId }) => vehicleId !== start.vehicleId)) {
    return { ...common, reason: "mixed-vehicles", status: "invalid" };
  }
  if (start.odometerMetres === undefined) {
    return { ...common, reason: "missing-start-odometer", status: "invalid" };
  }
  if (end.odometerMetres === undefined) {
    return { ...common, reason: "missing-end-odometer", status: "invalid" };
  }
  if (end.odometerMetres <= start.odometerMetres) {
    return { ...common, reason: "non-positive-distance", status: "invalid" };
  }
  if (hasDecreasingOdometer(refuellings)) {
    return { ...common, reason: "decreasing-odometer", status: "invalid" };
  }

  const fuelMicrolitres = safeSum(
    refuellings.slice(1).map(({ quantityMicrolitres }) => quantityMicrolitres),
  );
  if (fuelMicrolitres === undefined) {
    return { ...common, reason: "unsafe-total", status: "invalid" };
  }
  return {
    ...common,
    distanceMetres: end.odometerMetres - start.odometerMetres,
    fuelMicrolitres,
    status: "valid",
  };
}

function hasDecreasingOdometer(refuellings: readonly Refuelling[]): boolean {
  let previous: number | undefined;
  for (const { odometerMetres } of refuellings) {
    if (odometerMetres === undefined) continue;
    if (previous !== undefined && odometerMetres < previous) return true;
    previous = odometerMetres;
  }
  return false;
}

function safeSum(values: readonly number[]): number | undefined {
  let result = 0;
  for (const value of values) {
    result += value;
    if (!Number.isSafeInteger(result)) return undefined;
  }
  return result;
}

function emptySummary(unanchoredRefuellingIds: readonly RefuellingId[]): FuelConsumptionSummary {
  return {
    includedRefuellingIds: [],
    intervals: [],
    totalDistanceMetres: 0,
    totalFuelMicrolitres: 0,
    unanchoredRefuellingIds,
  };
}
