import {
  CorruptStoredDataError,
  mapHistoryRow,
  mapRefuellingRow,
  mapVehicleRow,
} from "./row-mappers";

const vehicleId = "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f";
const entryId = "018f47e2-7b30-7b80-99c0-81b80d9a57ce";
const timestamp = "2026-08-30T10:15:00.000Z";

const vehicleRow = {
  createdAt: timestamp,
  currentOdometerMetres: 125_000,
  distanceUnitPreference: "kilometres" as const,
  fuelConsumptionUnitPreference: "litresPer100Kilometres" as const,
  fuelTankCapacityMicrolitres: 60_000_000,
  fuelVolumeUnitPreference: "litres" as const,
  id: vehicleId,
  initialOdometerMetres: 120_000,
  make: "Volvo",
  manufactureYear: 2020,
  model: "V60",
  photoReference: null,
  registrationNumber: "WA 12345",
  updatedAt: timestamp,
  variant: "B4",
  vin: "YV1ZW1234L1234567",
};

const commonEntryRow = {
  costCurrency: "PLN",
  costMinorUnits: 25_000,
  createdAt: timestamp,
  id: entryId,
  notes: "Bez uwag",
  occurredAt: timestamp,
  odometerMetres: 125_000,
  serviceProvider: "Serwis",
  updatedAt: timestamp,
  vehicleId,
};

describe("database row mappers", () => {
  it("maps a stored vehicle into the domain model", () => {
    expect(mapVehicleRow(vehicleRow)).toEqual({
      ...vehicleRow,
      photoReference: undefined,
    });
  });

  it("keeps a legacy vehicle without fuel configuration readable", () => {
    expect(
      mapVehicleRow({
        ...vehicleRow,
        fuelConsumptionUnitPreference: null,
        fuelTankCapacityMicrolitres: null,
        fuelVolumeUnitPreference: null,
      }),
    ).toEqual(
      expect.not.objectContaining({
        fuelConsumptionUnitPreference: expect.anything(),
        fuelTankCapacityMicrolitres: expect.anything(),
        fuelVolumeUnitPreference: expect.anything(),
      }),
    );
  });

  it("maps complete refuelling pricing and rejects a partial pricing group", () => {
    const row = {
      createdAt: timestamp,
      fillKind: "full" as const,
      id: "018f47e2-7b35-7658-b336-34613389d00f",
      inputVolumeUnit: "litres" as const,
      occurredAt: timestamp,
      odometerMetres: 126_000,
      pricingInputMode: "total" as const,
      quantityMicrolitres: 45_000_000,
      totalCostCurrency: "PLN",
      totalCostMinorUnits: 29_000,
      unitPriceMilliUnits: 6_444,
      unitPriceVolumeUnit: "litres" as const,
      updatedAt: timestamp,
      vehicleId,
    };

    expect(mapRefuellingRow(row)).toMatchObject({
      fillKind: "full",
      pricing: {
        inputMode: "total",
        totalCost: { currency: "PLN", minorUnits: 29_000 },
        unitPriceMilliUnits: 6_444,
        unitPriceVolumeUnit: "litres",
      },
      quantityMicrolitres: 45_000_000,
    });
    expect(() => mapRefuellingRow({ ...row, totalCostCurrency: null })).toThrow(
      CorruptStoredDataError,
    );
  });

  it.each([
    {
      details: { description: "Przegląd okresowy", kind: "technical", result: "passed" },
      joined: {
        entry: { ...commonEntryRow, type: "inspection" as const },
        inspection: {
          description: "Przegląd okresowy",
          entryType: "inspection" as const,
          historyEntryId: entryId,
          kind: "technical" as const,
          result: "passed" as const,
        },
        repair: null,
        replacement: null,
      },
      type: "inspection",
    },
    {
      details: { item: "Filtr oleju", manufacturer: "Mann", partNumber: "HU 719/7 X" },
      joined: {
        entry: { ...commonEntryRow, type: "replacement" as const },
        inspection: null,
        repair: null,
        replacement: {
          entryType: "replacement" as const,
          historyEntryId: entryId,
          item: "Filtr oleju",
          manufacturer: "Mann",
          partNumber: "HU 719/7 X",
        },
      },
      type: "replacement",
    },
    {
      details: { description: "Wymieniono element", subject: "Naprawa zawieszenia" },
      joined: {
        entry: { ...commonEntryRow, type: "repair" as const },
        inspection: null,
        repair: {
          description: "Wymieniono element",
          entryType: "repair" as const,
          historyEntryId: entryId,
          subject: "Naprawa zawieszenia",
        },
        replacement: null,
      },
      type: "repair",
    },
  ])("maps a $type entry with exactly one detail row", ({ details, joined, type }) => {
    expect(mapHistoryRow(joined)).toEqual({
      cost: { currency: "PLN", minorUnits: 25_000 },
      createdAt: timestamp,
      details,
      id: entryId,
      notes: "Bez uwag",
      occurredAt: timestamp,
      odometerMetres: 125_000,
      serviceProvider: "Serwis",
      type,
      updatedAt: timestamp,
      vehicleId,
    });
  });

  it("rejects an entry whose detail row is missing", () => {
    expect(() =>
      mapHistoryRow({
        entry: { ...commonEntryRow, type: "repair" },
        inspection: null,
        repair: null,
        replacement: null,
      }),
    ).toThrow(CorruptStoredDataError);
  });

  it("rejects a partial stored cost", () => {
    expect(() =>
      mapHistoryRow({
        entry: {
          ...commonEntryRow,
          costCurrency: null,
          type: "repair",
        },
        inspection: null,
        repair: {
          description: null,
          entryType: "repair",
          historyEntryId: entryId,
          subject: "Naprawa",
        },
        replacement: null,
      }),
    ).toThrow(CorruptStoredDataError);
  });

  it("rejects identifiers which are not UUIDv7", () => {
    expect(() => mapVehicleRow({ ...vehicleRow, id: "not-a-uuid" })).toThrow(
      CorruptStoredDataError,
    );
  });
});
