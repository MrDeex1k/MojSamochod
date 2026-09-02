import { vehicleIdFromUuidV7 } from "../shared/identifiers";
import { createRefuelling, type Refuelling } from "./refuelling";
import { calculateFuelConsumption, fuelConsumptionValue } from "./fuel-consumption";

const vehicleId = vehicleIdFromUuidV7("01941f29-7c00-73e4-a310-744d2167fc5b");
const ids = [
  "01941f29-7c00-73e5-a310-744d2167fc5b",
  "01941f29-7c00-73e6-a310-744d2167fc5b",
  "01941f29-7c00-73e7-a310-744d2167fc5b",
  "01941f29-7c00-73e8-a310-744d2167fc5b",
  "01941f29-7c00-73e9-a310-744d2167fc5b",
] as const;

describe("fuel consumption", () => {
  it("includes partial fills without odometer between two full anchors", () => {
    const refuellings = [
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 10_000_000, 40_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "partial", undefined, 20_000_000),
      fixture(ids[2], "2026-08-20T10:00:00.000Z", "full", 10_600_000, 25_000_000),
    ];

    const summary = calculateFuelConsumption([refuellings[2], refuellings[0], refuellings[1]]);

    expect(summary.intervals).toEqual([
      {
        distanceMetres: 600_000,
        endRefuellingId: ids[2],
        fuelMicrolitres: 45_000_000,
        refuellingIds: ids.slice(0, 3),
        startRefuellingId: ids[0],
        status: "valid",
      },
    ]);
    expect(summary.includedRefuellingIds).toEqual(ids.slice(0, 3));
    expect(fuelConsumptionValue(summary, "litresPer100Kilometres")).toBe(7.5);
  });

  it("calculates a weighted aggregate instead of averaging interval results", () => {
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 0, 50_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "full", 100_000, 10_000_000),
      fixture(ids[2], "2026-08-20T10:00:00.000Z", "full", 300_000, 10_000_000),
    ]);

    expect(summary.totalDistanceMetres).toBe(300_000);
    expect(summary.totalFuelMicrolitres).toBe(20_000_000);
    expect(summary.includedRefuellingIds).toEqual(ids.slice(0, 3));
    expect(fuelConsumptionValue(summary, "litresPer100Kilometres")).toBeCloseTo(6.666_667, 6);
  });

  it("excludes an interval when a provided intermediate odometer decreases", () => {
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 1_000_000, 40_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "partial", 1_300_000, 20_000_000),
      fixture(ids[2], "2026-08-20T10:00:00.000Z", "full", 1_200_000, 25_000_000),
    ]);

    expect(summary.intervals[0]).toMatchObject({
      reason: "decreasing-odometer",
      status: "invalid",
    });
    expect(summary.includedRefuellingIds).toEqual([]);
    expect(fuelConsumptionValue(summary, "litresPer100Kilometres")).toBeUndefined();
  });

  it("reports missing anchor readings and a non-positive anchor distance", () => {
    const missingStart = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", undefined, 40_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "full", 1_000_000, 20_000_000),
    ]);
    const missingEnd = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 1_000_000, 40_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "full", undefined, 20_000_000),
    ]);
    const noDistance = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 1_000_000, 40_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "full", 1_000_000, 20_000_000),
    ]);

    expect(missingStart.intervals[0]).toMatchObject({ reason: "missing-start-odometer" });
    expect(missingEnd.intervals[0]).toMatchObject({ reason: "missing-end-odometer" });
    expect(noDistance.intervals[0]).toMatchObject({ reason: "non-positive-distance" });
  });

  it("rejects an interval containing a refuelling from another vehicle", () => {
    const otherVehicleId = vehicleIdFromUuidV7("01941f29-7c00-73f4-a310-744d2167fc5b");
    const mixed = fixture(ids[1], "2026-08-10T10:00:00.000Z", "partial", 1_100_000, 5_000_000);
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 1_000_000, 40_000_000),
      { ...mixed, vehicleId: otherVehicleId },
      fixture(ids[2], "2026-08-20T10:00:00.000Z", "full", 1_200_000, 20_000_000),
    ]);

    expect(summary.intervals[0]).toMatchObject({ reason: "mixed-vehicles", status: "invalid" });
  });

  it("keeps events before the first full fill unanchored and exposes the pending sequence", () => {
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "partial", undefined, 5_000_000),
      fixture(ids[1], "2026-08-10T10:00:00.000Z", "full", 1_000_000, 40_000_000),
      fixture(ids[2], "2026-08-20T10:00:00.000Z", "partial", undefined, 10_000_000),
    ]);

    expect(summary.unanchoredRefuellingIds).toEqual([ids[0]]);
    expect(summary.pendingInterval).toEqual({
      reason: "awaiting-full-tank",
      refuellingIds: [ids[1], ids[2]],
      startRefuellingId: ids[1],
    });
  });

  it("returns no consumption when no full refuelling exists", () => {
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "partial", 1_000_000, 5_000_000),
    ]);

    expect(summary).toMatchObject({
      includedRefuellingIds: [],
      intervals: [],
      unanchoredRefuellingIds: [ids[0]],
    });
    expect(summary.pendingInterval).toBeUndefined();
  });

  it("converts one canonical aggregate to all supported consumption units", () => {
    const summary = calculateFuelConsumption([
      fixture(ids[0], "2026-08-01T10:00:00.000Z", "full", 10_000_000, 40_000_000),
      fixture(ids[1], "2026-08-20T10:00:00.000Z", "full", 10_600_000, 45_000_000),
    ]);

    expect(fuelConsumptionValue(summary, "litresPer100Kilometres")).toBe(7.5);
    expect(fuelConsumptionValue(summary, "milesPerUsGallon")).toBeCloseTo(31.361_944, 6);
    expect(fuelConsumptionValue(summary, "milesPerImperialGallon")).toBeCloseTo(37.664_125, 6);
  });
});

function fixture(
  id: string,
  occurredAt: string,
  fillKind: "full" | "partial",
  odometerMetres: number | undefined,
  quantityMicrolitres: number,
): Refuelling {
  const result = createRefuelling(
    {
      fillKind,
      inputVolumeUnit: "litres",
      occurredAt,
      odometerMetres,
      quantityMicrolitres,
      vehicleId,
    },
    {
      clock: { now: () => new Date("2026-09-01T12:00:00.000Z") },
      idGenerator: { generate: () => id },
    },
  );
  if (!result.ok) throw new Error(`Invalid fixture: ${JSON.stringify(result.issues)}`);
  return result.value;
}
