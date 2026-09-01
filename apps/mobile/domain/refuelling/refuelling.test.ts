import { vehicleIdFromUuidV7 } from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { createRefuelling, updateRefuelling } from "./refuelling";

const now = new Date("2026-09-01T10:00:00.000Z");
const vehicleId = vehicleIdFromUuidV7("01941f29-7c00-73e4-a310-744d2167fc5b");
const generatedId = "01941f29-7c00-73e5-a310-744d2167fc5b";

function dependencies(): { clock: Clock; idGenerator: IdGenerator } {
  return {
    clock: { now: () => now },
    idGenerator: { generate: () => generatedId },
  };
}

describe("Refuelling", () => {
  it("creates a full refuelling with optional odometer and both price representations", () => {
    const result = createRefuelling(
      {
        fillKind: "full",
        inputVolumeUnit: "litres",
        occurredAt: "2026-09-01T09:00:00.000Z",
        odometerMetres: 120_000_000,
        pricing: {
          inputMode: "perVolumeUnit",
          totalCost: { currency: "PLN", minorUnits: 24_682 },
          unitPriceMilliUnits: 6_499,
          unitPriceVolumeUnit: "litres",
        },
        quantityMicrolitres: 37_978_000,
        vehicleId,
      },
      dependencies(),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        createdAt: now.toISOString(),
        fillKind: "full",
        id: generatedId,
        inputVolumeUnit: "litres",
        occurredAt: "2026-09-01T09:00:00.000Z",
        odometerMetres: 120_000_000,
        pricing: {
          inputMode: "perVolumeUnit",
          totalCost: { currency: "PLN", minorUnits: 24_682 },
          unitPriceMilliUnits: 6_499,
          unitPriceVolumeUnit: "litres",
        },
        quantityMicrolitres: 37_978_000,
        updatedAt: now.toISOString(),
        vehicleId,
      },
    });
  });

  it("accepts a partial refuelling without odometer or pricing", () => {
    const result = createRefuelling(
      {
        fillKind: "partial",
        inputVolumeUnit: "usGallons",
        occurredAt: "2026-09-01T09:00:00.000Z",
        quantityMicrolitres: 10_000_000,
        vehicleId,
      },
      dependencies(),
    );

    expect(result).toMatchObject({
      ok: true,
      value: { odometerMetres: undefined, pricing: undefined },
    });
  });

  it("collects invalid quantity, units, kind, pricing, and future time without consuming an id", () => {
    const idGenerator = { generate: jest.fn(() => generatedId) };
    const result = createRefuelling(
      {
        fillKind: "top-up",
        inputVolumeUnit: "quarts",
        occurredAt: "2026-09-01T10:01:00.000Z",
        pricing: {
          inputMode: "estimated",
          totalCost: { currency: "pln", minorUnits: -1 },
          unitPriceMilliUnits: 1.5,
          unitPriceVolumeUnit: "quarts",
        },
        quantityMicrolitres: 0,
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator },
    );

    expect(result).toMatchObject({
      issues: expect.arrayContaining([
        { code: "out-of-range", field: "quantityMicrolitres" },
        { code: "invalid-format", field: "inputVolumeUnit" },
        { code: "invalid-format", field: "fillKind" },
        { code: "out-of-range", field: "pricing.totalCost.minorUnits" },
        { code: "invalid-format", field: "pricing.totalCost.currency" },
        { code: "invalid-format", field: "pricing.unitPriceVolumeUnit" },
        { code: "invalid-format", field: "pricing.inputMode" },
        { code: "out-of-range", field: "pricing.unitPriceMilliUnits" },
        { code: "future", field: "occurredAt" },
      ]),
      ok: false,
    });
    expect(idGenerator.generate).not.toHaveBeenCalled();
  });

  it("preserves identity and creation time while updating editable values", () => {
    const created = createRefuelling(
      {
        fillKind: "partial",
        inputVolumeUnit: "litres",
        occurredAt: "2026-08-31T09:00:00.000Z",
        quantityMicrolitres: 10_000_000,
        vehicleId,
      },
      dependencies(),
    );
    if (!created.ok) throw new Error("Expected valid refuelling fixture");

    const updated = updateRefuelling(
      created.value,
      {
        fillKind: "full",
        inputVolumeUnit: "imperialGallons",
        occurredAt: "2026-09-01T09:00:00.000Z",
        odometerMetres: 121_000_000,
        quantityMicrolitres: 20_000_000,
        vehicleId,
      },
      { now: () => new Date("2026-09-01T11:00:00.000Z") },
    );

    expect(updated).toMatchObject({
      ok: true,
      value: {
        createdAt: created.value.createdAt,
        fillKind: "full",
        id: created.value.id,
        updatedAt: "2026-09-01T11:00:00.000Z",
      },
    });
  });
});
