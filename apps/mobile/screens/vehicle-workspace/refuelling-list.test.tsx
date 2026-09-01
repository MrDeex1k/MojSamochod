import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { calculateFuelConsumption } from "@/domain/refuelling/fuel-consumption";
import { createRefuelling, type Refuelling } from "@/domain/refuelling/refuelling";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { RefuellingList } from "./refuelling-list";

const now = new Date("2026-09-01T10:15:00.000Z");
const vehicle = expectValid(
  createVehicle(
    {
      distanceUnitPreference: "kilometres",
      fuelConsumptionUnitPreference: "litresPer100Kilometres",
      fuelTankCapacityMicrolitres: 60_000_000,
      fuelVolumeUnitPreference: "litres",
      make: "Volvo",
      model: "V60",
    },
    {
      clock: { now: () => now },
      idGenerator: { generate: () => "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f" },
    },
  ),
);

describe("RefuellingList", () => {
  it("shows an auditable average and marks the contributing refuellings", async () => {
    const first = refuelling(
      "018f47e2-7b35-7658-b336-34613389d00f",
      "2026-08-20T08:00:00.000Z",
      99_000_000,
      40_000_000,
    );
    const second = refuelling(
      "018f47e2-7b36-7658-b336-34613389d00f",
      "2026-09-01T08:00:00.000Z",
      99_600_000,
      45_000_000,
    );
    const records = [second, first];

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingList
          history={{ consumption: calculateFuelConsumption(records), refuellings: records }}
          onAdd={jest.fn()}
          onBack={jest.fn()}
          onConfigureFuel={jest.fn()}
          onSelect={jest.fn()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByText("7.50 l/100 km")).toBeOnTheScreen();
    expect(screen.getAllByText("Included in the average")).toHaveLength(2);
    expect(screen.getByText("Refuellings included in the average: 2.")).toBeOnTheScreen();
  });

  it("explains why a first full refuelling is not enough", async () => {
    const first = refuelling(
      "018f47e2-7b35-7658-b336-34613389d00f",
      "2026-08-20T08:00:00.000Z",
      99_000_000,
      40_000_000,
    );
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingList
          history={{ consumption: calculateFuelConsumption([first]), refuellings: [first] }}
          onAdd={jest.fn()}
          onBack={jest.fn()}
          onConfigureFuel={jest.fn()}
          onSelect={jest.fn()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(
      screen.getByText("Add two full refuellings with odometer readings to calculate consumption."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/l\/100 km/)).not.toBeOnTheScreen();
  });

  it("keeps a valid average while explaining a later invalid interval", async () => {
    const first = refuelling(
      "018f47e2-7b35-7658-b336-34613389d00f",
      "2026-08-20T08:00:00.000Z",
      99_000_000,
      40_000_000,
    );
    const second = refuelling(
      "018f47e2-7b36-7658-b336-34613389d00f",
      "2026-08-25T08:00:00.000Z",
      99_600_000,
      45_000_000,
    );
    const invalid = refuelling(
      "018f47e2-7b37-7658-b336-34613389d00f",
      "2026-09-01T08:00:00.000Z",
      99_500_000,
      20_000_000,
    );
    const records = [invalid, second, first];

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingList
          history={{ consumption: calculateFuelConsumption(records), refuellings: records }}
          onAdd={jest.fn()}
          onBack={jest.fn()}
          onConfigureFuel={jest.fn()}
          onSelect={jest.fn()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByText("7.50 l/100 km")).toBeOnTheScreen();
    expect(
      screen.getByText("The ending odometer must be higher than the starting reading."),
    ).toBeOnTheScreen();
    expect(screen.getAllByText("Included in the average")).toHaveLength(2);
  });
});

function refuelling(id: string, occurredAt: string, odometerMetres: number, quantity: number) {
  return expectValid(
    createRefuelling(
      {
        fillKind: "full",
        inputVolumeUnit: "litres",
        occurredAt,
        odometerMetres,
        quantityMicrolitres: quantity,
        vehicleId: vehicle.id,
      },
      { clock: { now: () => now }, idGenerator: { generate: () => id } },
    ),
  ) as Refuelling;
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
