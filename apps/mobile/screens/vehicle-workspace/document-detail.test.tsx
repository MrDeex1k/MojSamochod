import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { repositorySuccess } from "@/application/repositories/repository-result";
import { createVehicleDocument } from "@/domain/documents/vehicle-document";
import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import { createVehicle } from "@/domain/vehicle/vehicle";

import { DocumentDetail } from "./document-detail";

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
const document = expectValid(
  createVehicleDocument(
    {
      fileReference: managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f"),
      name: "Repair invoice",
      vehicleId: vehicle.id,
    },
    {
      clock: { now: () => now },
      idGenerator: { generate: () => "018f47e2-7b32-7658-b336-34613389d00f" },
    },
  ),
);

describe("DocumentDetail", () => {
  it("renders an image preview and exports through the native presenter", async () => {
    const share = jest.fn(async () => true);
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentDetail
          document={document}
          documents={service()}
          entries={[]}
          onBack={jest.fn()}
          onChanged={jest.fn()}
          onEdit={jest.fn()}
          picker={{ pick: jest.fn() }}
          presenter={{ share }}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    expect(await screen.findByLabelText("Repair invoice")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Export document" }));
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/png" })),
    );
  });

  it("deletes metadata and managed content only after confirmation", async () => {
    const services = service();
    const onChanged = jest.fn();
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === "destructive")?.onPress?.();
    });
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <DocumentDetail
          document={document}
          documents={services}
          entries={[]}
          onBack={jest.fn()}
          onChanged={onChanged}
          onEdit={jest.fn()}
          picker={{ pick: jest.fn() }}
          presenter={{ share: jest.fn() }}
          vehicle={vehicle}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Delete document" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(services.delete).toHaveBeenCalledWith(vehicle.id, document.id);
  });
});

function service(): jest.Mocked<VehicleDocumentService> {
  return {
    delete: jest.fn(async () => repositorySuccess(undefined)),
    getFile: jest.fn(async () =>
      repositorySuccess({ mimeType: "image/png", name: "invoice.png", uri: "file:///invoice.png" }),
    ),
  } as unknown as jest.Mocked<VehicleDocumentService>;
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
