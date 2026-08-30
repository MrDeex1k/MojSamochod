import type { Clock, IdGenerator } from "../shared/ports";
import { createVehicle } from "./vehicle";

const now = new Date("2026-08-30T14:30:00.000Z");
const generatedId = "01941f29-7c00-73e4-a310-744d2167fc5b";

function dependencies(): { clock: Clock; idGenerator: IdGenerator } {
  return {
    clock: { now: () => now },
    idGenerator: { generate: () => generatedId },
  };
}

describe("createVehicle", () => {
  it("normalizes identity data and keeps initial and current odometers separate", () => {
    const result = createVehicle(
      {
        distanceUnitPreference: "kilometres",
        initialOdometerMetres: 123_000,
        make: "  Volvo  ",
        manufactureYear: 2025,
        model: " V60 ",
        registrationNumber: "  WA 12345  ",
        variant: "  B4 Plus  ",
        vin: " yv1zwbfv7n1234567 ",
      },
      dependencies(),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        createdAt: "2026-08-30T14:30:00.000Z",
        currentOdometerMetres: 123_000,
        distanceUnitPreference: "kilometres",
        id: generatedId,
        initialOdometerMetres: 123_000,
        make: "Volvo",
        manufactureYear: 2025,
        model: "V60",
        photoReference: undefined,
        registrationNumber: "WA 12345",
        updatedAt: "2026-08-30T14:30:00.000Z",
        variant: "B4 Plus",
        vin: "YV1ZWBFV7N1234567",
      },
    });
  });

  it("allows optional identity and odometer values to remain unknown", () => {
    const result = createVehicle(
      {
        distanceUnitPreference: "miles",
        make: "Ford",
        model: "Mustang",
        registrationNumber: "   ",
        variant: "",
      },
      dependencies(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.initialOdometerMetres).toBeUndefined();
      expect(result.value.currentOdometerMetres).toBeUndefined();
      expect(result.value.registrationNumber).toBeUndefined();
      expect(result.value.variant).toBeUndefined();
    }
  });

  it("collects validation issues and does not consume an id for invalid input", () => {
    const idGenerator = { generate: jest.fn(() => generatedId) };
    const result = createVehicle(
      {
        distanceUnitPreference: "yards",
        initialOdometerMetres: -1,
        make: " ",
        manufactureYear: 2028,
        model: " ",
        vin: "INVALIDVIN",
      },
      { clock: { now: () => now }, idGenerator },
    );

    expect(result).toEqual({
      issues: [
        { code: "required", field: "make" },
        { code: "required", field: "model" },
        { code: "out-of-range", field: "initialOdometerMetres" },
        { code: "invalid-format", field: "vin" },
        { code: "out-of-range", field: "manufactureYear" },
        { code: "invalid-format", field: "distanceUnitPreference" },
      ],
      ok: false,
    });
    expect(idGenerator.generate).not.toHaveBeenCalled();
  });

  it("rejects a generator that violates the UUIDv7 contract", () => {
    expect(() =>
      createVehicle(
        { distanceUnitPreference: "kilometres", make: "Volvo", model: "V60" },
        { clock: { now: () => now }, idGenerator: { generate: () => "not-a-uuid" } },
      ),
    ).toThrow("Expected a canonical lowercase UUIDv7 identifier");
  });
});
