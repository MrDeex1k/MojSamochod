import { render, screen, userEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { createVehicle } from "@/domain/vehicle/vehicle";
import { HistoryCard } from "./workspace-history";

const clock = { now: () => new Date("2026-09-05T08:00:00.000Z") };
const vehicle = valid(
  createVehicle(
    {
      make: "Volvo",
      model: "V60",
      distanceUnitPreference: "kilometres",
      fuelTankCapacityMicrolitres: 60_000_000,
      fuelVolumeUnitPreference: "litres",
      fuelConsumptionUnitPreference: "litresPer100Kilometres",
    },
    { clock, idGenerator: { generate: () => "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f" } },
  ),
);

it.each([
  { distance: 1200000, amount: 12345, suffix: ", 1,200 km, $123.45" },
  { distance: 0, amount: 0, suffix: ", 0 km, $0.00" },
  { distance: undefined, amount: undefined, suffix: "" },
])(
  "announces the displayed history details including $suffix",
  async ({ distance, amount, suffix }) => {
    const entry = valid(
      createHistoryEntry(
        {
          vehicleId: vehicle.id,
          type: "repair",
          details: { subject: "Brake repair" },
          occurredAt: "2026-09-05T08:00:00.000Z",
          odometerMetres: distance,
          cost: amount === undefined ? undefined : { minorUnits: amount, currency: "USD" },
        },
        { clock, idGenerator: { generate: () => "01990000-0001-7000-8000-000000000001" } },
      ),
    );
    const onSelect = jest.fn();
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { width: 1200, height: 800, x: 0, y: 0 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <HistoryCard
          entries={[entry]}
          vehicle={vehicle}
          onSelectEntry={onSelect}
          onDataManagement={jest.fn()}
          onAddEntry={jest.fn()}
          onDocuments={jest.fn()}
          onFuel={jest.fn()}
          onReminders={jest.fn()}
        />
      </SafeAreaProvider>,
    );
    const button = screen.getByRole("button", {
      name: new RegExp(`^Repair — Brake repair, .*${escapeRegExp(suffix)}$`),
    });
    expect(button.props.accessibilityLabel).toContain("2026");
    await userEvent.press(button);
    expect(onSelect).toHaveBeenCalledWith(entry);
  },
);

function valid<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("Invalid fixture");
  return result.value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
