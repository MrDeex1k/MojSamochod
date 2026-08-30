import { createVehicleDocument } from "@/domain/documents/vehicle-document";
import { managedFileIdFromUuidV7, vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";

import type { AppDatabase } from "./database";
import { DrizzleVehicleDocumentRepository } from "./drizzle-vehicle-document-repository";

const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const fileReference = managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f");
const document = expectValid(
  createVehicleDocument(
    { fileReference, name: "Invoice", vehicleId },
    {
      clock: { now: () => new Date("2026-08-31T08:00:00.000Z") },
      idGenerator: { generate: () => "018f47e2-7b32-7658-b336-34613389d00f" },
    },
  ),
);

describe("DrizzleVehicleDocumentRepository", () => {
  it("creates metadata only when the vehicle and ready document file exist", async () => {
    const transaction = {
      insert: jest.fn(() => mutationBuilder()),
      select: jest
        .fn()
        .mockReturnValueOnce(selectOne({ id: vehicleId }))
        .mockReturnValueOnce(selectOne({ id: fileReference }))
        .mockReturnValueOnce(selectOne(undefined))
        .mockReturnValueOnce(selectOne(undefined)),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;

    await expect(new DrizzleVehicleDocumentRepository(database).create(document)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(transaction.insert).toHaveBeenCalledTimes(1);
  });

  it("does not create metadata for a missing managed file", async () => {
    const transaction = {
      insert: jest.fn(),
      select: jest
        .fn()
        .mockReturnValueOnce(selectOne({ id: vehicleId }))
        .mockReturnValueOnce(selectOne(undefined)),
    };
    const database = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    } as unknown as AppDatabase;

    await expect(
      new DrizzleVehicleDocumentRepository(database).create(document),
    ).resolves.toMatchObject({
      error: { kind: "not-found", operation: "vehicleDocument.create" },
      ok: false,
    });
    expect(transaction.insert).not.toHaveBeenCalled();
  });
});

function selectOne(value: unknown) {
  const terminal = { get: () => value };
  const limit = () => terminal;
  return { from: () => ({ limit, where: () => ({ limit }) }) };
}

function mutationBuilder() {
  return { values: () => ({ run: () => ({ changes: 1 }) }) };
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}
