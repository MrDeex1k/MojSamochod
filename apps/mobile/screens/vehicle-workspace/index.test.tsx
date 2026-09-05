import { render, screen, userEvent } from "@testing-library/react-native";

jest.mock("expo-router", () => ({ Redirect: () => null }));

jest.mock("@/components/providers/application-provider", () => ({
  useApplicationServices: jest.fn(),
}));

jest.mock("@/components/layout/adaptive-workspace", () => ({
  AdaptiveWorkspace: ({ phone }: { phone: React.ReactNode }) => phone,
}));

jest.mock("./vehicle-edit-form", () => {
  const { Button, View } = jest.requireActual("react-native");
  return {
    VehicleEditForm: ({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) => (
      <View>
        <Button onPress={onSaved} title="Save mock vehicle" />
        <Button onPress={onCancel} title="Cancel mock vehicle" />
      </View>
    ),
  };
});

import type { ApplicationServices } from "@/components/providers/application-provider";
import { calculateFuelConsumption } from "@/domain/refuelling/fuel-consumption";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { VehicleWorkspaceView } from "./index";

const now = new Date("2026-09-02T08:00:00.000Z");
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

describe("VehicleWorkspaceView", () => {
  it("returns to fuel after saving vehicle configuration opened from fuel", async () => {
    const onFuelChanged = jest.fn();
    const onSaved = jest.fn();
    await renderView("fuel", { onFuelChanged, onSaved });

    await userEvent.press(screen.getByRole("button", { name: "Save mock vehicle" }));

    expect(onFuelChanged).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("returns to history after saving the general vehicle editor", async () => {
    const onFuelChanged = jest.fn();
    const onSaved = jest.fn();
    await renderView("history", { onFuelChanged, onSaved });

    await userEvent.press(screen.getByRole("button", { name: "Save mock vehicle" }));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onFuelChanged).not.toHaveBeenCalled();
  });
});

async function renderView(
  returnTo: "fuel" | "history",
  callbacks: Readonly<{ onFuelChanged: jest.Mock; onSaved: jest.Mock }>,
) {
  await render(
    <VehicleWorkspaceView
      onDataManagement={jest.fn()}
      onErased={jest.fn()}
      documents={[]}
      entries={[]}
      mode={{ kind: "vehicle-form", returnTo }}
      onAddDocument={jest.fn()}
      onAddEntry={jest.fn()}
      onAddRefuelling={jest.fn()}
      onCancelFlow={jest.fn()}
      onChooseType={jest.fn()}
      onConfigureFuel={jest.fn()}
      onDocuments={jest.fn()}
      onDocumentsChanged={jest.fn()}
      onEditDocument={jest.fn()}
      onEditEntry={jest.fn()}
      onEditRefuelling={jest.fn()}
      onEditVehicle={jest.fn()}
      onFuel={jest.fn()}
      onReminders={jest.fn()}
      onFuelChanged={callbacks.onFuelChanged}
      onSaved={callbacks.onSaved}
      onSelectDocument={jest.fn()}
      onSelectEntry={jest.fn()}
      onSelectRefuelling={jest.fn()}
      photoUri={null}
      refuellingHistory={{ consumption: calculateFuelConsumption([]), refuellings: [] }}
      services={{} as ApplicationServices}
      vehicle={vehicle}
    />,
  );
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid vehicle fixture");
  return result.value;
}
