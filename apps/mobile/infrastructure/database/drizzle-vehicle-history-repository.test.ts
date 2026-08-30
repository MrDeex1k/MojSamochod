import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { createVehicle } from "@/domain/vehicle/vehicle";

import type { AppDatabase } from "./database";
import { DrizzleVehicleHistoryRepository } from "./drizzle-vehicle-history-repository";

const vehicleId = "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f";
const entryId = "018f47e2-7b30-7b80-99c0-81b80d9a57ce";
const now = new Date("2026-08-30T10:15:00.000Z");

const vehicleResult = createVehicle(
  {
    distanceUnitPreference: "kilometres",
    initialOdometerMetres: 120_000,
    make: "Volvo",
    model: "V60",
  },
  { clock: { now: () => now }, idGenerator: { generate: () => vehicleId } },
);

if (!vehicleResult.ok) throw new Error("Invalid vehicle test fixture");
const vehicle = vehicleResult.value;

const entryResult = createHistoryEntry(
  {
    details: { description: "Wymiana tulei", subject: "Naprawa zawieszenia" },
    occurredAt: "2026-08-29T09:00:00.000Z",
    odometerMetres: 125_000,
    type: "repair",
    vehicleId: vehicle.id,
  },
  { clock: { now: () => now }, idGenerator: { generate: () => entryId } },
);

if (!entryResult.ok) throw new Error("Invalid history test fixture");
const entry = entryResult.value;

describe("DrizzleVehicleHistoryRepository", () => {
  it("creates the first vehicle", async () => {
    const transaction = {
      insert: jest.fn(() => mutationBuilder(1)),
      select: jest.fn().mockReturnValue(selectOne(undefined)),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;
    const repository: VehicleRepository = new DrizzleVehicleHistoryRepository(database);

    await expect(repository.create(vehicle)).resolves.toEqual({ ok: true, value: undefined });
    expect(transaction.insert).toHaveBeenCalledTimes(1);
  });

  it("enforces the one-vehicle entitlement regardless of the new identifier", async () => {
    const transaction = {
      insert: jest.fn(),
      select: jest.fn().mockReturnValue(selectOne({ id: "another-vehicle" })),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;
    const repository: VehicleRepository = new DrizzleVehicleHistoryRepository(database);

    await expect(repository.create(vehicle)).resolves.toMatchObject({
      error: { kind: "conflict", operation: "vehicle.create" },
      ok: false,
    });
    expect(transaction.insert).not.toHaveBeenCalled();
  });

  it("creates the common entry, its details, and mileage update in one transaction", async () => {
    const insertedTables: unknown[] = [];
    const updatedTables: unknown[] = [];
    const select = jest
      .fn()
      .mockReturnValueOnce(selectOne({ id: vehicle.id }))
      .mockReturnValueOnce(selectOne(undefined));
    const transaction = {
      insert: jest.fn((table: unknown) => {
        insertedTables.push(table);
        return mutationBuilder(1);
      }),
      select,
      update: jest.fn((table: unknown) => {
        updatedTables.push(table);
        return mutationBuilder(1);
      }),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;
    const repository: HistoryEntryRepository = new DrizzleVehicleHistoryRepository(database);

    await expect(repository.create(entry)).resolves.toEqual({ ok: true, value: undefined });
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(insertedTables).toHaveLength(2);
    expect(updatedTables).toHaveLength(1);
  });

  it("does not mutate anything when the entry's vehicle is absent", async () => {
    const transaction = {
      insert: jest.fn(),
      select: jest.fn().mockReturnValue(selectOne(undefined)),
      update: jest.fn(),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;
    const repository: HistoryEntryRepository = new DrizzleVehicleHistoryRepository(database);

    const result = await repository.create(entry);

    expect(result).toMatchObject({
      error: { kind: "not-found", operation: "historyEntry.create" },
      ok: false,
    });
    expect(transaction.insert).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("maps invalid stored domain data to a typed corruption error", async () => {
    const database = {
      select: jest.fn().mockReturnValue({
        from: () => ({
          limit: () => ({
            get: () => ({
              createdAt: "invalid-date",
              currentOdometerMetres: null,
              distanceUnitPreference: "kilometres",
              id: vehicle.id,
              initialOdometerMetres: null,
              make: "Volvo",
              manufactureYear: null,
              model: "V60",
              registrationNumber: null,
              updatedAt: now.toISOString(),
              variant: null,
              vin: null,
            }),
          }),
        }),
      }),
    } as unknown as AppDatabase;
    const repository: VehicleRepository = new DrizzleVehicleHistoryRepository(database);

    await expect(repository.get()).resolves.toMatchObject({
      error: { kind: "corrupt-data", operation: "vehicle.get" },
      ok: false,
    });
  });
});

function selectOne(value: unknown) {
  const terminal = { get: () => value };
  const limit = () => terminal;
  return {
    from: () => ({
      get: () => value,
      limit,
      where: () => ({ get: () => value, limit }),
    }),
  };
}

function mutationBuilder(changes: number) {
  const terminal = { run: () => ({ changes }) };
  const where = () => terminal;
  return {
    set: () => ({ run: terminal.run, where }),
    values: () => terminal,
    where,
  };
}
