import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { repositorySuccess } from "@/application/repositories/repository-result";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { createVehicle } from "@/domain/vehicle/vehicle";
import type { VehiclePhotoPicker } from "@/infrastructure/media/gallery-vehicle-photo-picker";

import { VehicleEditForm } from "./vehicle-edit-form";

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

describe("VehicleEditForm", () => {
  it("updates editable vehicle data without replacing identity or current mileage", async () => {
    const vehicles = vehicleRepository();
    const onSaved = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <VehicleEditForm
          clock={{ now: () => new Date("2026-08-31T10:15:00.000Z") }}
          existingPhotoUri={null}
          idGenerator={{ generate: () => "018f47e2-7b31-7658-b336-34613389d00f" }}
          managedFiles={managedFiles()}
          onCancel={jest.fn()}
          onSaved={onSaved}
          photoPicker={photoPicker()}
          vehicle={vehicleResult.value}
          vehicles={vehicles}
        />
      </SafeAreaProvider>,
    );
    await userEvent.clear(screen.getByLabelText("Model"));
    await userEvent.type(screen.getByLabelText("Model"), "V60 Cross Country");
    await userEvent.press(screen.getByRole("button", { name: "Save vehicle" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(vehicles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: vehicleResult.value.createdAt,
        currentOdometerMetres: vehicleResult.value.currentOdometerMetres,
        id: vehicleResult.value.id,
        fuelTankCapacityMicrolitres: 60_000_000,
        model: "V60 Cross Country",
      }),
    );
  });

  it("requires legacy vehicles to complete fuel configuration when they are edited", async () => {
    const vehicles = vehicleRepository();
    const legacyVehicle = {
      ...vehicleResult.value,
      fuelConsumptionUnitPreference: undefined,
      fuelTankCapacityMicrolitres: undefined,
      fuelVolumeUnitPreference: undefined,
    };
    await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <VehicleEditForm
          clock={{ now: () => new Date("2026-08-31T10:15:00.000Z") }}
          existingPhotoUri={null}
          idGenerator={{ generate: () => "018f47e2-7b31-7658-b336-34613389d00f" }}
          managedFiles={managedFiles()}
          onCancel={jest.fn()}
          onSaved={jest.fn()}
          photoPicker={photoPicker()}
          vehicle={legacyVehicle}
          vehicles={vehicles}
        />
      </SafeAreaProvider>,
    );

    await userEvent.press(screen.getByRole("button", { name: "Save vehicle" }));
    expect(
      screen.getByText("Enter a valid fuel tank capacity greater than zero."),
    ).toBeOnTheScreen();
    expect(vehicles.update).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Fuel tank capacity"), "55");
    await userEvent.press(screen.getByRole("button", { name: "Save vehicle" }));

    await waitFor(() => expect(vehicles.update).toHaveBeenCalledTimes(1));
    expect(vehicles.update).toHaveBeenCalledWith(
      expect.objectContaining({ fuelTankCapacityMicrolitres: 55_000_000 }),
    );
  });
});

function vehicleRepository(): jest.Mocked<VehicleRepository> {
  return {
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    update: jest.fn<
      ReturnType<VehicleRepository["update"]>,
      Parameters<VehicleRepository["update"]>
    >(async () => repositorySuccess(undefined)),
  } as jest.Mocked<VehicleRepository>;
}

function managedFiles(): Pick<ManagedFileCoordinator, "import" | "remove"> {
  return { import: jest.fn(), remove: jest.fn() } as never;
}

function photoPicker(): VehiclePhotoPicker {
  const result = { kind: "cancelled" } as const;
  return { select: jest.fn(async () => result) };
}

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 0, left: 0, right: 0, top: 0 },
};
