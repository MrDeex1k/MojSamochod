import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-community/datetimepicker", () => () => null);

import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createRefuelling } from "@/domain/refuelling/refuelling";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { RefuellingForm } from "./refuelling-form";

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

describe("RefuellingForm", () => {
  it("creates a full refuelling and derives unit pricing from the entered total", async () => {
    const refuellings = service();
    const onSaved = jest.fn();
    await renderForm(refuellings, onSaved);

    expect(screen.queryByText("Fuel volume unit")).not.toBeOnTheScreen();
    await userEvent.type(screen.getByLabelText("Fuel quantity (l)"), "45");
    await userEvent.type(screen.getByLabelText("Current odometer"), "99000");
    await userEvent.type(screen.getByLabelText("Total amount"), "300.00");
    await userEvent.press(screen.getByRole("button", { name: "Save refuelling" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(refuellings.create).toHaveBeenCalledWith({
      fillKind: "full",
      inputVolumeUnit: "litres",
      occurredAt: "2026-09-01T10:15:00.000Z",
      odometerMetres: 99_000_000,
      pricing: {
        inputMode: "total",
        totalCost: { currency: "USD", minorUnits: 30_000 },
        unitPriceMilliUnits: 6_667,
        unitPriceVolumeUnit: "litres",
      },
      quantityMicrolitres: 45_000_000,
      vehicleId: vehicle.id,
    });
  });

  it("keeps an over-precise unit price in the form without writing", async () => {
    const refuellings = service();
    await renderForm(refuellings, jest.fn());

    await userEvent.type(screen.getByLabelText("Fuel quantity (l)"), "45");
    await userEvent.press(screen.getByRole("button", { name: "Price per volume unit" }));
    await userEvent.type(screen.getByLabelText("Unit price (/l)"), "6.6667");
    await userEvent.press(screen.getByRole("button", { name: "Save refuelling" }));

    expect(
      screen.getByText(
        "Enter a valid price. A unit price may contain at most three decimal places.",
      ),
    ).toBeOnTheScreen();
    expect(refuellings.create).not.toHaveBeenCalled();
  });

  it("opens a historical litre entry in the vehicle's current gallon preference", async () => {
    const existing = expectValid(
      createRefuelling(
        {
          fillKind: "full",
          inputVolumeUnit: "litres",
          occurredAt: "2026-09-01T08:00:00.000Z",
          pricing: {
            inputMode: "perVolumeUnit",
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

    await renderForm(service(), jest.fn(), {
      refuelling: existing,
      vehicle: { ...vehicle, fuelVolumeUnitPreference: "usGallons" },
    });

    expect(screen.getByLabelText("Fuel quantity (gal (US))")).toHaveDisplayValue("11.887742");
    expect(screen.getByLabelText("Unit price (/gal (US))")).toHaveDisplayValue("25.237");
    expect(screen.queryByText("Fuel volume unit")).not.toBeOnTheScreen();
  });
});

async function renderForm(
  refuellings: jest.Mocked<RefuellingService>,
  onSaved: jest.Mock,
  overrides: Partial<React.ComponentProps<typeof RefuellingForm>> = {},
) {
  await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <RefuellingForm
        clock={{ now: () => now }}
        onCancel={jest.fn()}
        onSaved={onSaved}
        refuellings={refuellings}
        vehicle={vehicle}
        {...overrides}
      />
    </SafeAreaProvider>,
  );
}

function service(): jest.Mocked<RefuellingService> {
  return {
    create: jest.fn(async (input) =>
      repositorySuccess({
        ...input,
        createdAt: now.toISOString(),
        id: "018f47e2-7b35-7658-b336-34613389d00f",
        updatedAt: now.toISOString(),
      }),
    ),
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
