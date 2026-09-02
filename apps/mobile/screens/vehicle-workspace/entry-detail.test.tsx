import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { EntryDetail } from "./entry-detail";

const now = new Date("2026-08-30T10:15:00.000Z");
const vehicleResult = createVehicle(
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
);
if (!vehicleResult.ok) throw new Error("Invalid vehicle fixture");
const entryResult = createHistoryEntry(
  {
    cost: { currency: "USD", minorUnits: 43_050 },
    details: { item: "Engine oil", manufacturer: "Volvo" },
    occurredAt: "2026-08-29T14:30:00.000Z",
    type: "replacement",
    vehicleId: vehicleResult.value.id,
  },
  {
    clock: { now: () => now },
    idGenerator: { generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" },
  },
);
if (!entryResult.ok) throw new Error("Invalid entry fixture");

describe("EntryDetail", () => {
  it("shows present values without empty optional rows", async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryDetail
          entry={entryResult.value}
          historyEntries={historyRepository()}
          onBack={jest.fn()}
          onDeleted={jest.fn()}
          onEdit={jest.fn()}
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByText("Engine oil")).toBeOnTheScreen();
    expect(screen.getByText("Volvo")).toBeOnTheScreen();
    expect(screen.getByText("$430.50")).toBeOnTheScreen();
    expect(screen.queryByText(/UTC/)).not.toBeOnTheScreen();
    expect(screen.queryByText("Notes")).not.toBeOnTheScreen();
  });

  it("deletes only after explicit destructive confirmation", async () => {
    const repository = historyRepository();
    const onDeleted = jest.fn();
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === "destructive")?.onPress?.();
    });
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryDetail
          entry={entryResult.value}
          historyEntries={repository}
          onBack={jest.fn()}
          onDeleted={onDeleted}
          onEdit={jest.fn()}
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(alert).toHaveBeenCalledWith(
      "Delete Engine oil?",
      "This operation cannot be undone.",
      expect.any(Array),
    );
    expect(repository.delete).toHaveBeenCalledWith(vehicleResult.value.id, entryResult.value.id);
  });
});

function historyRepository(): jest.Mocked<HistoryEntryRepository> {
  return {
    create: jest.fn(),
    delete: jest.fn<
      ReturnType<HistoryEntryRepository["delete"]>,
      Parameters<HistoryEntryRepository["delete"]>
    >(async () => repositorySuccess(undefined)),
    get: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  } as jest.Mocked<HistoryEntryRepository>;
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
