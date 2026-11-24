import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { createVehicle } from "@/domain/vehicle/vehicle";
import type { DocumentFilePicker } from "@/infrastructure/documents/system-document-picker";

import { DocumentForm } from "./document-form";

jest.mock("@react-native-community/datetimepicker", () => {
  const { Button } = jest.requireActual("react-native");
  return function Picker({
    onValueChange,
  }: {
    onValueChange: (event: unknown, date: Date) => void;
  }) {
    return (
      <Button
        title="Move date spinner"
        onPress={() => onValueChange({}, new Date("2026-12-01T12:00:00Z"))}
      />
    );
  };
});

const now = new Date("2026-08-31T08:00:00.000Z");
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

describe("DocumentForm", () => {
  it("selects a supported file, derives its name, and creates the document", async () => {
    const create = jest.fn(async () => repositorySuccess({} as never));
    const onSaved = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{ create } as unknown as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={onSaved}
          picker={picker()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveDisplayValue("invoice"));
    await userEvent.press(screen.getByRole("button", { name: "Save document" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      vehicle.id,
      expect.objectContaining({ mimeType: "application/pdf", name: "invoice.pdf" }),
      expect.objectContaining({ name: "invoice" }),
    );
  });

  it("keeps the form open and explains an oversized file", async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{} as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          picker={{ pick: jest.fn(async () => ({ kind: "invalid-size" as const })) }}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));

    expect(await screen.findByText("Choose a non-empty file of at most 20 MiB.")).toBeOnTheScreen();
  });

  it.each([
    ["Confirm date", "2026-12-01"],
    ["Cancel date selection", ""],
  ])("only submits the committed iOS date after %s", async (action, expectedDate) => {
    const create = jest.fn(async () => repositorySuccess({} as never));
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{ create } as unknown as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          picker={picker()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );
    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await userEvent.press(screen.getByRole("button", { name: "Document date" }));
    await userEvent.press(screen.getByRole("button", { name: "Move date spinner" }));
    const blockedSave = screen.getByRole("button", { name: "Saving…" });
    expect(blockedSave).toBeDisabled();
    await userEvent.press(blockedSave);
    expect(create).not.toHaveBeenCalled();
    await userEvent.press(screen.getByRole("button", { name: action }));
    await userEvent.press(screen.getByRole("button", { name: "Save document" }));
    expect(create).toHaveBeenCalledWith(
      vehicle.id,
      expect.anything(),
      expect.objectContaining({ documentDate: expectedDate }),
    );
  });

  it("reports the actual size rejected during import and keeps the draft", async () => {
    const create = jest.fn(async () => repositoryFailure("unsupported", "managedFile.import"));
    const onSaved = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{ create } as unknown as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={onSaved}
          picker={picker()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );
    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await userEvent.press(screen.getByRole("button", { name: "Save document" }));
    expect(await screen.findByText("Choose a non-empty file of at most 20 MiB.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Name")).toHaveDisplayValue("invoice");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows an amount field error without writing invalid metadata", async () => {
    const create = jest.fn(async () => repositorySuccess({} as never));
    const onSaved = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{ create } as unknown as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={onSaved}
          picker={picker()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await userEvent.type(screen.getByLabelText("Amount"), "12.345");
    await userEvent.press(screen.getByRole("button", { name: "Save document" }));

    expect(
      await screen.findByText(
        "Enter a valid non-negative amount using the currency's decimal precision.",
      ),
    ).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("stores document amounts using the selected currency precision", async () => {
    const create = jest.fn(async () => repositorySuccess({} as never));
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentForm
          documents={{ create } as unknown as VehicleDocumentService}
          entries={[]}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          picker={picker()}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Choose file" }));
    await userEvent.clear(screen.getByLabelText("Currency"));
    await userEvent.type(screen.getByLabelText("Currency"), "KWD");
    await userEvent.type(screen.getByLabelText("Amount"), "0.123");
    await userEvent.press(screen.getByRole("button", { name: "Save document" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      vehicle.id,
      expect.anything(),
      expect.objectContaining({ amount: { currency: "KWD", minorUnits: 123 } }),
    );
  });
});

function picker(): DocumentFilePicker {
  return {
    pick: jest.fn(async () => ({
      document: {
        mimeType: "application/pdf" as const,
        name: "invoice.pdf",
        size: 100,
        uri: "file:///invoice.pdf",
      },
      kind: "selected" as const,
    })),
  };
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
