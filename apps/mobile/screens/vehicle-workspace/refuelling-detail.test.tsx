import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createRefuelling } from "@/domain/refuelling/refuelling";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { RefuellingDetail } from "./refuelling-detail";

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
const refuelling = expectValid(
  createRefuelling(
    {
      fillKind: "full",
      inputVolumeUnit: "litres",
      occurredAt: "2026-09-01T08:00:00.000Z",
      odometerMetres: 99_000_000,
      pricing: {
        inputMode: "total",
        totalCost: { currency: "USD", minorUnits: 30_000 },
        unitPriceMilliUnits: 6_667,
        unitPriceVolumeUnit: "litres",
      },
      quantityMicrolitres: 45_000_000,
      vehicleId: vehicle.id,
    },
    {
      clock: { now: () => now },
      idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" },
    },
  ),
);

describe("RefuellingDetail", () => {
  it("shows all saved values and deletes only after explicit confirmation", async () => {
    const refuellings = service();
    const onDeleted = jest.fn();
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === "destructive")?.onPress?.();
    });
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingDetail
          onBack={jest.fn()}
          onDeleted={onDeleted}
          onEdit={jest.fn()}
          refuelling={refuelling}
          refuellings={refuellings}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getAllByText("45 l")).toHaveLength(2);
    expect(screen.getByText("$300.00")).toBeOnTheScreen();
    expect(screen.getByText("6.667 USD/l")).toBeOnTheScreen();
    expect(screen.queryByText(/UTC/)).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Delete refuelling" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(alert).toHaveBeenCalledWith(
      "Delete this refuelling?",
      expect.stringContaining("45 l, 99,000 km"),
      expect.any(Array),
    );
    expect(refuellings.delete).toHaveBeenCalledWith(vehicle.id, refuelling.id);
  });

  it("does not reserve rows for optional values that were not recorded", async () => {
    const minimal = expectValid(
      createRefuelling(
        {
          fillKind: "partial",
          inputVolumeUnit: "litres",
          occurredAt: "2026-09-01T08:00:00.000Z",
          quantityMicrolitres: 10_000_000,
          vehicleId: vehicle.id,
        },
        {
          clock: { now: () => now },
          idGenerator: { generate: () => "018f47e2-7b36-7658-b336-34613389d00f" },
        },
      ),
    );
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingDetail
          onBack={jest.fn()}
          onDeleted={jest.fn()}
          onEdit={jest.fn()}
          refuelling={minimal}
          refuellings={service()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(screen.queryByText("Current odometer")).not.toBeOnTheScreen();
    expect(screen.queryByText("Total amount")).not.toBeOnTheScreen();
    expect(screen.queryByText("Unit price")).not.toBeOnTheScreen();
  });

  it("renders historical volume and unit price using the current vehicle preference", async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <RefuellingDetail
          onBack={jest.fn()}
          onDeleted={jest.fn()}
          onEdit={jest.fn()}
          refuelling={refuelling}
          refuellings={service()}
          vehicle={{ ...vehicle, fuelVolumeUnitPreference: "usGallons" }}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getAllByText("11.89 gal (US)")).toHaveLength(2);
    expect(screen.getByText("25.237 USD/gal (US)")).toBeOnTheScreen();
    expect(screen.queryByText("45 l")).not.toBeOnTheScreen();
  });
});

function service(): jest.Mocked<RefuellingService> {
  return {
    delete: jest.fn(async () => repositorySuccess(undefined)),
  } as unknown as jest.Mocked<RefuellingService>;
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
