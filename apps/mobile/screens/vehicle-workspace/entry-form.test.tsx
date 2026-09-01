import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-community/datetimepicker", () => () => null);

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { EntryForm } from "./entry-form";

const now = new Date("2026-08-30T10:15:00.000Z");
const vehicleResult = createVehicle(
  {
    distanceUnitPreference: "kilometres",
    fuelConsumptionUnitPreference: "litresPer100Kilometres",
    fuelTankCapacityMicrolitres: 60_000_000,
    fuelVolumeUnitPreference: "litres",
    initialOdometerMetres: 82_000_000,
    make: "Volvo",
    model: "V60",
  },
  {
    clock: { now: () => now },
    idGenerator: { generate: () => "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f" },
  },
);
if (!vehicleResult.ok) throw new Error("Invalid vehicle fixture");
const repairResult = createHistoryEntry(
  {
    details: { subject: "Brake system" },
    occurredAt: now.toISOString(),
    type: "repair",
    vehicleId: vehicleResult.value.id,
  },
  {
    clock: { now: () => now },
    idGenerator: { generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" },
  },
);
if (!repairResult.ok) throw new Error("Invalid repair fixture");

describe("EntryForm", () => {
  it("creates a replacement with UTC time and optional common values", async () => {
    const repository = historyRepository();
    const onSaved = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryForm
          clock={{ now: () => now }}
          historyEntries={repository}
          idGenerator={{ generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" }}
          onCancel={jest.fn()}
          onSaved={onSaved}
          type="replacement"
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );
    await userEvent.type(screen.getByLabelText("Replaced item"), "Engine oil");
    await userEvent.type(screen.getByLabelText("Current odometer"), "85000");
    await userEvent.type(screen.getByLabelText("Total cost"), "430.50");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cost: { currency: "USD", minorUnits: 43_050 },
        details: expect.objectContaining({ item: "Engine oil" }),
        occurredAt: "2026-08-30T10:15:00.000Z",
        odometerMetres: 85_000_000,
        type: "replacement",
      }),
    );
  });

  it("stores entry costs using the selected currency precision", async () => {
    const repository = historyRepository();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryForm
          clock={{ now: () => now }}
          historyEntries={repository}
          idGenerator={{ generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" }}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          type="replacement"
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );
    await userEvent.type(screen.getByLabelText("Replaced item"), "Engine oil");
    await userEvent.clear(screen.getByLabelText("Currency"));
    await userEvent.type(screen.getByLabelText("Currency"), "JPY");
    await userEvent.type(screen.getByLabelText("Total cost"), "430");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(repository.create).toHaveBeenCalledTimes(1));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ cost: { currency: "JPY", minorUnits: 430 } }),
    );
  });

  it("keeps an invalid required field in the form without writing", async () => {
    const repository = historyRepository();

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryForm
          clock={{ now: () => now }}
          historyEntries={repository}
          idGenerator={{ generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" }}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          type="repair"
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );
    await userEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("This field is required.")).toBeOnTheScreen();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("uses an edit-specific title for an existing entry", async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <EntryForm
          clock={{ now: () => now }}
          entry={repairResult.value}
          historyEntries={historyRepository()}
          idGenerator={{ generate: () => "018f47e2-7b30-7b80-99c0-81b80d9a57ce" }}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          type="repair"
          vehicle={vehicleResult.value}
        />
      </SafeAreaProvider>,
    );

    expect(screen.getByRole("header", { name: "Edit repair" })).toBeOnTheScreen();
  });
});

function historyRepository(): jest.Mocked<HistoryEntryRepository> {
  return {
    create: jest.fn<
      ReturnType<HistoryEntryRepository["create"]>,
      Parameters<HistoryEntryRepository["create"]>
    >(async () => repositorySuccess(undefined)),
    delete: jest.fn<
      ReturnType<HistoryEntryRepository["delete"]>,
      Parameters<HistoryEntryRepository["delete"]>
    >(async () => repositorySuccess(undefined)),
    get: jest.fn<
      ReturnType<HistoryEntryRepository["get"]>,
      Parameters<HistoryEntryRepository["get"]>
    >(async () => repositorySuccess(null)),
    list: jest.fn<
      ReturnType<HistoryEntryRepository["list"]>,
      Parameters<HistoryEntryRepository["list"]>
    >(async () => repositorySuccess([])),
    update: jest.fn<
      ReturnType<HistoryEntryRepository["update"]>,
      Parameters<HistoryEntryRepository["update"]>
    >(async () => repositorySuccess(undefined)),
  };
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
