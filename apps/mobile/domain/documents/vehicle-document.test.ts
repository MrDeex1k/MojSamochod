import { managedFileIdFromUuidV7, vehicleIdFromUuidV7 } from "../shared/identifiers";
import { createVehicleDocument, documentDate, updateVehicleDocument } from "./vehicle-document";

const now = new Date("2026-08-31T08:00:00.000Z");
const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const fileReference = managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f");
const documentId = "018f47e2-7b32-7ab4-8c75-0795d7062735";

describe("VehicleDocument", () => {
  it("creates normalized document metadata with independent timestamps", () => {
    const result = createVehicleDocument(
      {
        amount: { currency: "PLN", minorUnits: 12_345 },
        documentDate: "2026-08-30",
        fileReference,
        name: "  Faktura za naprawę  ",
        notes: "  Zapłacono kartą  ",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        amount: { currency: "PLN", minorUnits: 12_345 },
        createdAt: now.toISOString(),
        documentDate: "2026-08-30",
        id: documentId,
        name: "Faktura za naprawę",
        notes: "Zapłacono kartą",
        updatedAt: now.toISOString(),
      }),
    });
  });

  it("rejects impossible calendar dates and incomplete money", () => {
    const result = createVehicleDocument(
      {
        amount: { currency: "pln", minorUnits: -1 },
        documentDate: "2026-02-30",
        fileReference,
        name: "",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );

    expect(result).toMatchObject({
      issues: expect.arrayContaining([
        { code: "required", field: "name" },
        { code: "invalid-format", field: "documentDate" },
        { code: "out-of-range", field: "amount.minorUnits" },
        { code: "invalid-format", field: "amount.currency" },
      ]),
      ok: false,
    });
  });

  it("preserves identity and creation time during metadata updates", () => {
    const created = createVehicleDocument(
      { fileReference, name: "Invoice", vehicleId },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );
    if (!created.ok) throw new Error("Expected a valid fixture");

    const updated = updateVehicleDocument(
      created.value,
      { fileReference, name: "Updated invoice", vehicleId },
      { now: () => new Date("2026-09-01T08:00:00.000Z") },
    );

    expect(updated).toMatchObject({
      ok: true,
      value: {
        createdAt: now.toISOString(),
        id: documentId,
        name: "Updated invoice",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
    });
  });

  it("accepts an omitted document date", () => {
    expect(documentDate(undefined)).toEqual({ ok: true, value: undefined });
  });
});
