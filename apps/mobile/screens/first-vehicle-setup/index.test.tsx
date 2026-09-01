import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock("@/components/providers/application-provider", () => ({
  useApplicationServices: jest.fn(),
}));

import { repositorySuccess } from "@/application/repositories/repository-result";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import type { ReadyManagedFileMetadata } from "@/domain/files/managed-file";
import type { VehiclePhotoPicker } from "@/infrastructure/media/gallery-vehicle-photo-picker";

import { CreateFirstVehicleForm } from ".";

const vehicleId = "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f";
const photoId = "018f47e2-7b31-7658-b336-34613389d00f";
const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};

describe("CreateFirstVehicleForm", () => {
  it("shows field errors and does not write an invalid vehicle", async () => {
    const vehicles = vehicleRepository();

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CreateFirstVehicleForm
          clock={{ now: () => new Date("2026-08-30T10:15:00.000Z") }}
          idGenerator={{ generate: () => vehicleId }}
          managedFiles={managedFiles()}
          onCreated={jest.fn()}
          photoPicker={photoPicker()}
          vehicles={vehicles}
        />
      </SafeAreaProvider>,
    );
    await userEvent.press(screen.getByRole("button", { name: "Add vehicle" }));

    expect(screen.getAllByText("This field is required.")).toHaveLength(2);
    expect(
      screen.getByText("Enter a valid fuel tank capacity greater than zero."),
    ).toBeOnTheScreen();
    expect(vehicles.create).not.toHaveBeenCalled();
  });

  it("creates a vehicle from required data and converts kilometres to metres", async () => {
    const vehicles = vehicleRepository();
    const onCreated = jest.fn();

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CreateFirstVehicleForm
          clock={{ now: () => new Date("2026-08-30T10:15:00.000Z") }}
          idGenerator={{ generate: () => vehicleId }}
          managedFiles={managedFiles()}
          onCreated={onCreated}
          photoPicker={photoPicker()}
          vehicles={vehicles}
        />
      </SafeAreaProvider>,
    );
    await userEvent.type(screen.getByLabelText("Make"), "Volvo");
    await userEvent.type(screen.getByLabelText("Model"), "V60");
    await userEvent.press(screen.getByRole("button", { name: "l" }));
    await userEvent.press(screen.getByRole("button", { name: "l/100 km" }));
    await userEvent.type(screen.getByLabelText("Fuel tank capacity"), "60");
    await userEvent.press(screen.getByRole("button", { name: "km" }));
    await userEvent.type(screen.getByLabelText("Odometer when record keeping starts"), "82000");
    await userEvent.press(screen.getByRole("button", { name: "Add vehicle" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(vehicles.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currentOdometerMetres: 82_000_000,
        fuelConsumptionUnitPreference: "litresPer100Kilometres",
        fuelTankCapacityMicrolitres: 60_000_000,
        fuelVolumeUnitPreference: "litres",
        initialOdometerMetres: 82_000_000,
        make: "Volvo",
        model: "V60",
      }),
    );
  });

  it("imports a selected gallery photo before linking it to the vehicle", async () => {
    const vehicles = vehicleRepository();
    const files = managedFiles();
    const ids = [photoId, vehicleId];

    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CreateFirstVehicleForm
          clock={{ now: () => new Date("2026-08-30T10:15:00.000Z") }}
          idGenerator={{ generate: () => ids.shift() ?? vehicleId }}
          managedFiles={files}
          onCreated={jest.fn()}
          photoPicker={photoPicker({
            kind: "selected",
            mimeType: "image/jpeg",
            originalName: "car.jpg",
            uri: "file:///car.jpg",
          })}
          vehicles={vehicles}
        />
      </SafeAreaProvider>,
    );
    await userEvent.type(screen.getByLabelText("Make"), "Volvo");
    await userEvent.type(screen.getByLabelText("Model"), "V60");
    await userEvent.type(screen.getByLabelText("Fuel tank capacity"), "60");
    await userEvent.press(screen.getByRole("button", { name: "Add photo" }));
    expect(await screen.findByLabelText("Vehicle photo")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Add vehicle" }));

    await waitFor(() => expect(vehicles.create).toHaveBeenCalledTimes(1));
    expect(files.import).toHaveBeenCalledWith(
      expect.objectContaining({ managedFileId: photoId, sourceUri: "file:///car.jpg" }),
    );
    expect(vehicles.create).toHaveBeenCalledWith(
      expect.objectContaining({ photoReference: photoId }),
    );
  });
});

function vehicleRepository(): jest.Mocked<VehicleRepository> {
  return {
    create: jest.fn<
      ReturnType<VehicleRepository["create"]>,
      Parameters<VehicleRepository["create"]>
    >(async () => repositorySuccess(undefined)),
    delete: jest.fn<
      ReturnType<VehicleRepository["delete"]>,
      Parameters<VehicleRepository["delete"]>
    >(async () => repositorySuccess(undefined)),
    get: jest.fn<ReturnType<VehicleRepository["get"]>, Parameters<VehicleRepository["get"]>>(
      async () => repositorySuccess(null),
    ),
    update: jest.fn<
      ReturnType<VehicleRepository["update"]>,
      Parameters<VehicleRepository["update"]>
    >(async () => repositorySuccess(undefined)),
  };
}

function managedFiles(): jest.Mocked<Pick<ManagedFileCoordinator, "import" | "remove">> {
  return {
    import: jest.fn<
      ReturnType<ManagedFileCoordinator["import"]>,
      Parameters<ManagedFileCoordinator["import"]>
    >(async () => repositorySuccess({} as ReadyManagedFileMetadata)),
    remove: jest.fn<
      ReturnType<ManagedFileCoordinator["remove"]>,
      Parameters<ManagedFileCoordinator["remove"]>
    >(async () => repositorySuccess(undefined)),
  };
}

function photoPicker(
  result: Awaited<ReturnType<VehiclePhotoPicker["select"]>> = { kind: "cancelled" },
): VehiclePhotoPicker {
  return { select: jest.fn(async () => result) };
}
