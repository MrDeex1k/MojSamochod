import { useFormExitGuard } from "@/components/layout/navigation-guard";
import { repositoryFailure } from "@/application/repositories/repository-result";
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { TextField } from "@/components/ui/text-field";
import { FuelConfigurationFields } from "@/components/vehicle/fuel-configuration-fields";
import type { FuelConsumptionUnit } from "@/domain/refuelling/fuel-consumption";
import {
  microlitresToVolume,
  parseVolumeToMicrolitres,
  type Microlitres,
  type VolumeUnit,
} from "@/domain/refuelling/volume";
import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import type { ValidationIssue } from "@/domain/shared/result";
import { distanceToMetres, metresToDistance } from "@/domain/vehicle/distance";
import { updateVehicle, type DistanceUnit, type Vehicle } from "@/domain/vehicle/vehicle";
import type {
  VehiclePhotoPicker,
  VehiclePhotoSelectionResult,
} from "@/infrastructure/media/gallery-vehicle-photo-picker";
import { useAppTranslation } from "@/localization/use-app-translation";

type SelectedPhoto = Extract<VehiclePhotoSelectionResult, { kind: "selected" }>;
type PhotoChange =
  | Readonly<{ kind: "keep" | "remove" }>
  | Readonly<{ kind: "new"; photo: SelectedPhoto }>;

export function VehicleEditForm({
  clock,
  embedded = false,
  existingPhotoUri,
  idGenerator,
  managedFiles,
  onCancel,
  onSaved,
  photoPicker,
  vehicle,
  vehicles,
}: Readonly<{
  clock: Clock;
  embedded?: boolean;
  existingPhotoUri: string | null;
  idGenerator: IdGenerator;
  managedFiles: Pick<ManagedFileCoordinator, "import" | "remove">;
  onCancel: () => void;
  onSaved: () => void;
  photoPicker: VehiclePhotoPicker;
  vehicle: Vehicle;
  vehicles: VehicleRepository;
}>) {
  const { t } = useAppTranslation();
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [variant, setVariant] = useState(vehicle.variant ?? "");
  const [manufactureYear, setManufactureYear] = useState(
    vehicle.manufactureYear ? String(vehicle.manufactureYear) : "",
  );
  const [registrationNumber, setRegistrationNumber] = useState(vehicle.registrationNumber ?? "");
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [initialOdometer, setInitialOdometer] = useState(() => formatOdometer(vehicle));
  const initialOdometerMetres = useRef<number | undefined>(vehicle.initialOdometerMetres);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(vehicle.distanceUnitPreference);
  const [fuelVolumeUnit, setFuelVolumeUnit] = useState<VolumeUnit>(
    vehicle.fuelVolumeUnitPreference ?? defaultFuelVolumeUnit(vehicle),
  );
  const [fuelConsumptionUnit, setFuelConsumptionUnit] = useState<FuelConsumptionUnit>(
    vehicle.fuelConsumptionUnitPreference ?? defaultFuelConsumptionUnit(vehicle),
  );
  const [fuelTankCapacity, setFuelTankCapacity] = useState(() =>
    formatFuelTankCapacity(
      vehicle,
      vehicle.fuelVolumeUnitPreference ?? defaultFuelVolumeUnit(vehicle),
    ),
  );
  const fuelTankCapacityMicrolitres = useRef<number>(
    vehicle.fuelTankCapacityMicrolitres ?? Number.NaN,
  );
  const [photoChange, setPhotoChange] = useState<PhotoChange>({ kind: "keep" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cancel = useFormExitGuard(
    {
      make,
      model,
      variant,
      manufactureYear,
      registrationNumber,
      vin,
      initialOdometer,
      distanceUnit,
      fuelVolumeUnit,
      fuelConsumptionUnit,
      fuelTankCapacity,
      photoChange,
    },
    saving,
    onCancel,
  );
  const photoUri =
    photoChange.kind === "new"
      ? photoChange.photo.uri
      : photoChange.kind === "keep"
        ? existingPhotoUri
        : null;

  const selectPhoto = async () => {
    const result = await photoPicker.select();
    if (result.kind === "selected") setPhotoChange({ kind: "new", photo: result });
    if (result.kind === "denied") setFormError(t("firstVehicle.photoDenied"));
    if (result.kind === "unavailable") setFormError(t("firstVehicle.photoError"));
  };

  const changeDistanceUnit = (nextUnit: DistanceUnit) => {
    if (
      initialOdometerMetres.current !== undefined &&
      Number.isFinite(initialOdometerMetres.current)
    ) {
      setInitialOdometer(formatDistance(initialOdometerMetres.current, nextUnit));
    }
    setDistanceUnit(nextUnit);
  };

  const changeFuelVolumeUnit = (nextUnit: VolumeUnit) => {
    if (Number.isFinite(fuelTankCapacityMicrolitres.current)) {
      setFuelTankCapacity(
        formatFuelCapacityValue(fuelTankCapacityMicrolitres.current as Microlitres, nextUnit),
      );
    }
    setFuelVolumeUnit(nextUnit);
  };

  const save = async () => {
    if (saving) return;
    setFormError(null);
    const newPhotoId =
      photoChange.kind === "new" ? managedFileIdFromUuidV7(idGenerator.generate()) : undefined;
    const photoReference =
      photoChange.kind === "new"
        ? newPhotoId
        : photoChange.kind === "keep"
          ? vehicle.photoReference
          : undefined;
    const result = updateVehicle(
      vehicle,
      {
        distanceUnitPreference: distanceUnit,
        fuelConsumptionUnitPreference: fuelConsumptionUnit,
        fuelTankCapacityMicrolitres: fuelTankCapacityMicrolitres.current,
        fuelVolumeUnitPreference: fuelVolumeUnit,
        initialOdometerMetres: initialOdometerMetres.current,
        make,
        manufactureYear: manufactureYear.trim() ? Number(manufactureYear) : undefined,
        model,
        photoReference,
        registrationNumber,
        variant,
        vin,
      },
      clock,
    );
    if (!result.ok) {
      setErrors(mapIssues(result.issues, t));
      return;
    }

    setErrors({});
    setSaving(true);
    const outcome = await persistVehicleUpdate({
      managedFiles,
      newPhotoId,
      photoChange,
      updatedVehicle: result.value,
      vehicle,
      vehicles,
    })
      .catch((cause: unknown) => repositoryFailure("unavailable", "form.save", cause))
      .finally(() => setSaving(false));
    if (!outcome) {
      setFormError(t("vehicleEdit.error"));
      return;
    }
    onSaved();
  };

  const content = (
    <Card>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("vehicleEdit.title")}
      </Text>
      <TextField
        error={errors.make}
        label={t("firstVehicle.makeLabel")}
        onChangeText={setMake}
        value={make}
      />
      <TextField
        error={errors.model}
        label={t("firstVehicle.modelLabel")}
        onChangeText={setModel}
        value={model}
      />
      <TextField label={t("firstVehicle.variantLabel")} onChangeText={setVariant} value={variant} />
      <TextField
        error={errors.manufactureYear}
        keyboardType="number-pad"
        label={t("firstVehicle.manufactureYearLabel")}
        onChangeText={setManufactureYear}
        value={manufactureYear}
      />
      <TextField
        autoCapitalize="characters"
        label={t("firstVehicle.registrationNumberLabel")}
        onChangeText={setRegistrationNumber}
        value={registrationNumber}
      />
      <TextField
        autoCapitalize="characters"
        error={errors.vin}
        label={t("firstVehicle.vinLabel")}
        maxLength={17}
        onChangeText={setVin}
        value={vin}
      />
      <Text className="text-heading font-semibold text-primary">
        {t("firstVehicle.photoLabel")}
      </Text>
      {photoUri ? (
        <Image
          accessibilityLabel={t("firstVehicle.photoLabel")}
          className="aspect-square w-full rounded-control bg-surface-muted"
          contentFit="cover"
          source={{ uri: photoUri }}
        />
      ) : null}
      <View className="flex-row gap-compact">
        <Button
          className="flex-1"
          label={photoUri ? t("firstVehicle.photoChangeAction") : t("firstVehicle.photoAction")}
          onPress={() => void selectPhoto()}
          variant="secondary"
        />
        {photoUri ? (
          <Button
            className="flex-1"
            label={t("firstVehicle.photoRemoveAction")}
            onPress={() => setPhotoChange({ kind: "remove" })}
            variant="danger"
          />
        ) : null}
      </View>
      <Text className="text-label font-semibold text-primary">
        {t("firstVehicle.distanceUnitLabel")}
      </Text>
      <View className="flex-row gap-compact">
        <Button
          className="flex-1"
          label="km"
          onPress={() => changeDistanceUnit("kilometres")}
          variant={distanceUnit === "kilometres" ? "primary" : "secondary"}
        />
        <Button
          className="flex-1"
          label="mi"
          onPress={() => changeDistanceUnit("miles")}
          variant={distanceUnit === "miles" ? "primary" : "secondary"}
        />
      </View>
      <TextField
        error={errors.initialOdometerMetres}
        keyboardType="number-pad"
        label={t("firstVehicle.initialOdometerLabel")}
        onChangeText={(value) => {
          setInitialOdometer(value);
          initialOdometerMetres.current = parseOdometer(value, distanceUnit);
        }}
        value={initialOdometer}
      />
      <FuelConfigurationFields
        capacity={fuelTankCapacity}
        capacityError={errors.fuelTankCapacityMicrolitres}
        consumptionUnit={fuelConsumptionUnit}
        onCapacityChange={(value) => {
          setFuelTankCapacity(value);
          fuelTankCapacityMicrolitres.current = parseFuelCapacity(value, fuelVolumeUnit);
        }}
        onConsumptionUnitChange={setFuelConsumptionUnit}
        onVolumeUnitChange={changeFuelVolumeUnit}
        volumeUnit={fuelVolumeUnit}
      />
      {formError ? <Text className="text-body text-danger">{formError}</Text> : null}
      <Button disabled={saving} label={t("vehicleEdit.save")} onPress={() => void save()} />
      <Button label={t("vehicleEdit.cancel")} onPress={cancel} variant="secondary" />
    </Card>
  );

  return embedded ? (
    <ScrollView
      contentContainerClassName="grow"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

async function persistVehicleUpdate({
  managedFiles,
  newPhotoId,
  photoChange,
  updatedVehicle,
  vehicle,
  vehicles,
}: Readonly<{
  managedFiles: Pick<ManagedFileCoordinator, "import" | "remove">;
  newPhotoId?: ReturnType<typeof managedFileIdFromUuidV7>;
  photoChange: PhotoChange;
  updatedVehicle: Vehicle;
  vehicle: Vehicle;
  vehicles: VehicleRepository;
}>): Promise<boolean> {
  try {
    if (photoChange.kind === "new" && newPhotoId) {
      const imported = await managedFiles.import({
        kind: "vehicle-photo",
        managedFileId: newPhotoId,
        mimeType: photoChange.photo.mimeType,
        originalName: photoChange.photo.originalName,
        sourceUri: photoChange.photo.uri,
      });
      if (!imported.ok) return false;
    }
    const updated = await vehicles.update(updatedVehicle);
    if (!updated.ok) {
      if (newPhotoId) await managedFiles.remove(newPhotoId);
      return false;
    }
    if (vehicle.photoReference && vehicle.photoReference !== updatedVehicle.photoReference) {
      await managedFiles.remove(vehicle.photoReference);
    }
    return true;
  } catch {
    if (newPhotoId) await managedFiles.remove(newPhotoId).catch(() => undefined);
    return false;
  }
}

function parseOdometer(value: string, unit: DistanceUnit): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  const numeric = Number(value);
  return distanceToMetres(numeric, unit);
}

function formatOdometer(vehicle: Vehicle): string {
  if (vehicle.initialOdometerMetres === undefined) return "";
  return formatDistance(vehicle.initialOdometerMetres, vehicle.distanceUnitPreference);
}

function formatDistance(metres: number, unit: DistanceUnit): string {
  return String(Math.round(metresToDistance(metres, unit)));
}

function defaultFuelVolumeUnit(vehicle: Vehicle): VolumeUnit {
  return vehicle.distanceUnitPreference === "miles" ? "usGallons" : "litres";
}

function defaultFuelConsumptionUnit(vehicle: Vehicle): FuelConsumptionUnit {
  return vehicle.distanceUnitPreference === "miles" ? "milesPerUsGallon" : "litresPer100Kilometres";
}

function formatFuelTankCapacity(vehicle: Vehicle, unit: VolumeUnit): string {
  if (vehicle.fuelTankCapacityMicrolitres === undefined) return "";
  return formatFuelCapacityValue(vehicle.fuelTankCapacityMicrolitres, unit);
}

function formatFuelCapacityValue(value: Microlitres, unit: VolumeUnit): string {
  return String(Math.round(microlitresToVolume(value, unit)));
}

function parseFuelCapacity(value: string, unit: VolumeUnit): number {
  const parsed = parseVolumeToMicrolitres(
    value.trim().replace(",", "."),
    unit,
    "fuelTankCapacity",
    0,
  );
  return parsed.ok ? parsed.value : Number.NaN;
}

function mapIssues(issues: readonly ValidationIssue[], t: (key: string) => string) {
  return Object.fromEntries(
    issues.map((issue) => {
      if (issue.field === "vin") return [issue.field, t("firstVehicle.vinError")];
      if (issue.field === "manufactureYear") return [issue.field, t("firstVehicle.yearError")];
      if (issue.field === "initialOdometerMetres")
        return [issue.field, t("firstVehicle.invalidNumberError")];
      if (issue.field === "fuelTankCapacityMicrolitres")
        return [issue.field, t("firstVehicle.fuelTankCapacityError")];
      return [issue.field, t("firstVehicle.requiredError")];
    }),
  );
}
