import { createHistoryEntry, type HistoryEntry } from "@/domain/history/history-entry";
import type { ValidationResult } from "@/domain/shared/result";
import { createVehicle, type Vehicle } from "@/domain/vehicle/vehicle";

export type DevelopmentVehicleHistoryFixture = Readonly<{
  entries: readonly HistoryEntry[];
  vehicle: Vehicle;
}>;

const fixtureClock = { now: () => new Date("2026-08-30T12:00:00.000Z") };

export function createDevelopmentVehicleHistoryFixture(): DevelopmentVehicleHistoryFixture {
  const vehicle = expectValid(
    createVehicle(
      {
        distanceUnitPreference: "kilometres",
        fuelConsumptionUnitPreference: "litresPer100Kilometres",
        fuelTankCapacityMicrolitres: 60_000_000,
        fuelVolumeUnitPreference: "litres",
        initialOdometerMetres: 82_000_000,
        make: "Volvo",
        manufactureYear: 2020,
        model: "V60",
        registrationNumber: "WA 12345",
        variant: "B4 Momentum",
        vin: "YV1ZW1234L1234567",
      },
      {
        clock: fixtureClock,
        idGenerator: { generate: () => "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f" },
      },
    ),
  );

  const entries = [
    createHistoryEntry(
      {
        cost: { currency: "PLN", minorUnits: 18_900 },
        details: { description: "Badanie okresowe", kind: "technical", result: "passed" },
        occurredAt: "2025-09-12T08:30:00.000Z",
        odometerMetres: 84_300_000,
        serviceProvider: "Okręgowa stacja kontroli pojazdów",
        type: "inspection",
        vehicleId: vehicle.id,
      },
      {
        clock: fixtureClock,
        idGenerator: { generate: () => "019940f3-d900-7c12-a071-e1ef4c7834b1" },
      },
    ),
    createHistoryEntry(
      {
        cost: { currency: "PLN", minorUnits: 45_900 },
        details: {
          item: "Olej silnikowy i filtr oleju",
          manufacturer: "Volvo",
          partNumber: "31471015",
        },
        occurredAt: "2026-02-18T14:00:00.000Z",
        odometerMetres: 91_750_000,
        serviceProvider: "Serwis niezależny",
        type: "replacement",
        vehicleId: vehicle.id,
      },
      {
        clock: fixtureClock,
        idGenerator: { generate: () => "019c72f5-6500-7d24-8e9f-6dd4bc21ddf2" },
      },
    ),
    createHistoryEntry(
      {
        cost: { currency: "PLN", minorUnits: 128_000 },
        details: {
          description: "Wymiana przednich tulei wahaczy i ustawienie geometrii",
          subject: "Naprawa zawieszenia",
        },
        notes: "Po naprawie wykonano jazdę próbną.",
        occurredAt: "2026-07-03T10:15:00.000Z",
        odometerMetres: 98_420_000,
        serviceProvider: "Serwis niezależny",
        type: "repair",
        vehicleId: vehicle.id,
      },
      {
        clock: fixtureClock,
        idGenerator: { generate: () => "0197cc99-a660-7674-93b5-4c3399d2aa93" },
      },
    ),
  ].map(expectValid);

  return { entries, vehicle };
}

function expectValid<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`Invalid development fixture: ${JSON.stringify(result.issues)}`);
  }

  return result.value;
}
