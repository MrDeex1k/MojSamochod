import { createRefuelling } from "@/domain/refuelling/refuelling";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";

import type { AppDatabase } from "./database";
import { DrizzleRefuellingRepository } from "./drizzle-refuelling-repository";

const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const refuelling = expectValid(
  createRefuelling(
    {
      fillKind: "full",
      inputVolumeUnit: "litres",
      occurredAt: "2026-08-31T08:00:00.000Z",
      odometerMetres: 85_000_000,
      pricing: {
        inputMode: "total",
        totalCost: { currency: "PLN", minorUnits: 30_000 },
        unitPriceMilliUnits: 6_667,
        unitPriceVolumeUnit: "litres",
      },
      quantityMicrolitres: 45_000_000,
      vehicleId,
    },
    {
      clock: { now: () => new Date("2026-08-31T09:00:00.000Z") },
      idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" },
    },
  ),
);

describe("DrizzleRefuellingRepository", () => {
  it("creates a refuelling and advances the vehicle odometer in one transaction", async () => {
    const transaction = {
      insert: jest.fn(() => mutationBuilder()),
      select: jest
        .fn()
        .mockReturnValueOnce(selectOne({ fuelTankCapacityMicrolitres: 60_000_000 }))
        .mockReturnValueOnce(selectOne(undefined)),
      update: jest.fn(() => mutationBuilder()),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;

    await expect(new DrizzleRefuellingRepository(database).create(refuelling)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(transaction.insert).toHaveBeenCalledTimes(1);
    expect(transaction.update).toHaveBeenCalledTimes(1);
  });

  it("requires a legacy vehicle to complete fuel configuration before its first refuelling", async () => {
    const transaction = {
      insert: jest.fn(),
      select: jest.fn().mockReturnValueOnce(selectOne({ fuelTankCapacityMicrolitres: null })),
      update: jest.fn(),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;

    await expect(
      new DrizzleRefuellingRepository(database).create(refuelling),
    ).resolves.toMatchObject({
      error: { kind: "conflict", operation: "refuelling.create" },
      ok: false,
    });
    expect(transaction.insert).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("does not update a refuelling that belongs to another vehicle", async () => {
    const transaction = {
      select: jest
        .fn()
        .mockReturnValueOnce(selectOne({ fuelTankCapacityMicrolitres: 60_000_000 }))
        .mockReturnValueOnce(selectOne(undefined)),
      update: jest.fn(),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;

    await expect(
      new DrizzleRefuellingRepository(database).update(refuelling),
    ).resolves.toMatchObject({
      error: { kind: "not-found", operation: "refuelling.update" },
      ok: false,
    });
    expect(transaction.update).not.toHaveBeenCalled();
  });
});

function selectOne(value: unknown) {
  const terminal = { get: () => value };
  const limit = () => terminal;
  return { from: () => ({ limit, where: () => ({ limit }) }) };
}

function mutationBuilder() {
  return {
    set: () => ({ where: () => ({ run: () => ({ changes: 1 }) }) }),
    values: () => ({ run: () => ({ changes: 1 }) }),
  };
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid refuelling fixture");
  return result.value;
}
