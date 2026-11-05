import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import { DocumentEntrySelector } from "./document-entry-selector";

it("filters related entries by subject and returns the chosen identity", async () => {
  const entries = ["Oil service", "Brake pads"].map((subject, index) => {
    const result = createHistoryEntry(
      {
        vehicleId: vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f"),
        type: "repair",
        details: { subject },
        occurredAt: "2026-09-05T08:00:00.000Z",
      },
      {
        clock: { now: () => new Date("2026-09-05T08:00:00.000Z") },
        idGenerator: { generate: () => `01990000-0001-7000-8000-00000000000${index}` },
      },
    );
    if (!result.ok) throw new Error("Invalid fixture");
    return result.value;
  });
  const onSelect = jest.fn();
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { width: 393, height: 852, x: 0, y: 0 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
    >
      <DocumentEntrySelector entries={entries} selectedId="" onSelect={onSelect} />
    </SafeAreaProvider>,
  );
  await userEvent.press(screen.getByRole("button", { name: "Choose related entry" }));
  await userEvent.type(screen.getByLabelText("Search entries"), "BRAKE");
  expect(screen.queryByRole("radio", { name: /Oil service/ })).toBeNull();
  await userEvent.press(screen.getByRole("radio", { name: /Brake pads/ }));
  expect(onSelect).toHaveBeenCalledWith(entries[1].id);
  expect(screen.queryByLabelText("Search entries")).toBeNull();
});

it("hides old search results and never applies their cursor to a new query during debounce", async () => {
  jest.useFakeTimers({ legacyFakeTimers: true });
  try {
    const { entries, vehicle } = createDevelopmentVehicleHistoryFixture();
    const first = entries[0]!;
    const searchReferences = jest.fn().mockResolvedValue({
      ok: true,
      value: {
        entries: [first],
        nextCursor: { id: first.id, createdAt: first.createdAt, occurredAt: first.occurredAt },
      },
    });
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { width: 393, height: 852, x: 0, y: 0 },
          insets: { top: 0, bottom: 0, left: 0, right: 0 },
        }}
      >
        <DocumentEntrySelector
          entries={[]}
          selectedId=""
          onSelect={jest.fn()}
          vehicleId={vehicle.id}
          historyEntries={{ searchReferences } as unknown as HistoryEntryRepository}
        />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Choose related entry" }));
    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(searchReferences).toHaveBeenCalledTimes(1);
    await fireEvent.changeText(screen.getByLabelText("Search entries"), "new query");
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    await fireEvent(screen.getByTestId("document-reference-results"), "endReached");
    expect(searchReferences).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(searchReferences).toHaveBeenLastCalledWith(vehicle.id, "new query");
  } finally {
    jest.useRealTimers();
  }
});
