import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createVehicle } from "@/domain/vehicle/vehicle";
import type { DocumentFilePicker } from "@/infrastructure/documents/system-document-picker";

import { DocumentForm } from "./document-form";

const now = new Date("2026-08-31T08:00:00.000Z");
const vehicle = expectValid(
  createVehicle(
    { distanceUnitPreference: "kilometres", make: "Volvo", model: "V60" },
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

    expect(await screen.findByText("The file exceeds the 20 MB limit.")).toBeOnTheScreen();
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
      await screen.findByText("Enter a valid non-negative amount with up to two decimal places."),
    ).toBeOnTheScreen();
    expect(create).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
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
