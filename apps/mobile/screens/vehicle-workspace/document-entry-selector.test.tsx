import { render, screen, userEvent } from "@testing-library/react-native";
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
