import { getLocales } from "expo-localization";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Text, View } from "react-native";

import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { Screen } from "@/components/layout/screen";
import { SupportedOrientation } from "@/components/layout/supported-orientation";
import { useApplicationServices } from "@/components/providers/application-provider";
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
import { createVehicle, type DistanceUnit, type Vehicle } from "@/domain/vehicle/vehicle";
import type {
  VehiclePhotoPicker,
  VehiclePhotoSelectionResult,
} from "@/infrastructure/media/gallery-vehicle-photo-picker";
import { useAppTranslation } from "@/localization/use-app-translation";

type CreateFirstVehicleFormProps = Readonly<{
  clock: Clock;
  idGenerator: IdGenerator;
  managedFiles: Pick<ManagedFileCoordinator, "import" | "remove">;
  onCreated: () => void;
  photoPicker: VehiclePhotoPicker;
  vehicles: VehicleRepository;
}>;

type FieldErrors = Partial<Record<string, string>>;
type SelectedPhoto = Extract<VehiclePhotoSelectionResult, { kind: "selected" }>;

export function FirstVehicleSetupScreen() {
  const router = useRouter();
  const services = useApplicationServices();
  return (
    <SupportedOrientation>
      <CreateFirstVehicleForm {...services} onCreated={() => router.replace("/vehicle")} />
    </SupportedOrientation>
  );
}

export function CreateFirstVehicleForm({
  clock,
  idGenerator,
  managedFiles,
  onCreated,
  photoPicker,
  vehicles,
}: CreateFirstVehicleFormProps) {
  const { t } = useAppTranslation();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vin, setVin] = useState("");
  const [initialOdometer, setInitialOdometer] = useState("");
  const initialOdometerMetres = useRef<number | undefined>(undefined);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(defaultDistanceUnit);
  const [fuelTankCapacity, setFuelTankCapacity] = useState("");
  const fuelTankCapacityMicrolitres = useRef(Number.NaN);
  const [fuelVolumeUnit, setFuelVolumeUnit] = useState<VolumeUnit>(defaultFuelVolumeUnit);
  const [fuelConsumptionUnit, setFuelConsumptionUnit] = useState<FuelConsumptionUnit>(
    defaultFuelConsumptionUnit,
  );
  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectPhoto = async () => {
    setFormError(null);
    const result = await photoPicker.select();
    if (result.kind === "selected") setPhoto(result);
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
        formatFuelCapacity(fuelTankCapacityMicrolitres.current as Microlitres, nextUnit),
      );
    }
    setFuelVolumeUnit(nextUnit);
  };

  const save = async () => {
    if (saving) return;
    setFormError(null);
    const photoId = photo ? managedFileIdFromUuidV7(idGenerator.generate()) : undefined;
    const result = createVehicle(
      {
        distanceUnitPreference: distanceUnit,
        fuelConsumptionUnitPreference: fuelConsumptionUnit,
        fuelTankCapacityMicrolitres: fuelTankCapacityMicrolitres.current,
        fuelVolumeUnitPreference: fuelVolumeUnit,
        initialOdometerMetres: initialOdometerMetres.current,
        make,
        manufactureYear: parseOptionalInteger(manufactureYear),
        model,
        photoReference: photoId,
        registrationNumber,
        variant,
        vin,
      },
      { clock, idGenerator },
    );
    if (!result.ok) {
      setErrors(mapValidationIssues(result.issues, t));
      return;
    }

    setErrors({});
    setSaving(true);
    const outcome = await persistFirstVehicle({
      managedFiles,
      photo,
      vehicle: result.value,
      vehicles,
    }).finally(() => setSaving(false));
    if (outcome === "photo-error") setFormError(t("firstVehicle.photoError"));
    if (outcome === "vehicle-error") setFormError(t("firstVehicle.genericError"));
    if (outcome === "created") onCreated();
  };

  return (
    <Screen contentClassName="items-center">
      <Card className="w-full max-w-2xl">
        <Text className="text-label font-semibold uppercase tracking-widest text-accent">
          {t("common.appName")}
        </Text>
        <Text accessibilityRole="header" className="text-display font-bold text-primary">
          {t("firstVehicle.title")}
        </Text>
        <Text className="text-body text-secondary">{t("firstVehicle.description")}</Text>

        <View className="gap-content">
          <TextField
            autoCapitalize="words"
            error={errors.make}
            label={t("firstVehicle.makeLabel")}
            onChangeText={setMake}
            placeholder={t("firstVehicle.makePlaceholder")}
            returnKeyType="next"
            value={make}
          />
          <TextField
            autoCapitalize="words"
            error={errors.model}
            label={t("firstVehicle.modelLabel")}
            onChangeText={setModel}
            placeholder={t("firstVehicle.modelPlaceholder")}
            returnKeyType="next"
            value={model}
          />
          <TextField
            label={t("firstVehicle.variantLabel")}
            onChangeText={setVariant}
            value={variant}
          />
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
            autoCorrect={false}
            error={errors.vin}
            label={t("firstVehicle.vinLabel")}
            maxLength={17}
            onChangeText={setVin}
            value={vin}
          />
        </View>

        <View className="gap-compact">
          <Text className="text-heading font-semibold text-primary">
            {t("firstVehicle.photoLabel")}
          </Text>
          {photo ? (
            <Image
              accessibilityLabel={t("firstVehicle.photoLabel")}
              className="aspect-square w-full rounded-control bg-surface-muted"
              contentFit="cover"
              source={{ uri: photo.uri }}
            />
          ) : null}
          <View className="flex-row gap-compact">
            <Button
              className="flex-1"
              label={photo ? t("firstVehicle.photoChangeAction") : t("firstVehicle.photoAction")}
              onPress={() => void selectPhoto()}
              variant="secondary"
            />
            {photo ? (
              <Button
                className="flex-1"
                label={t("firstVehicle.photoRemoveAction")}
                onPress={() => setPhoto(null)}
                variant="danger"
              />
            ) : null}
          </View>
        </View>

        <View className="gap-content">
          <Text className="text-heading font-semibold text-primary">
            {t("firstVehicle.initialOdometerLabel")}
          </Text>
          <Text className="text-body text-secondary">
            {t("firstVehicle.initialOdometerHelper")}
          </Text>
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
              initialOdometerMetres.current = parseDistance(value, distanceUnit);
            }}
            value={initialOdometer}
          />
        </View>

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

        {formError ? (
          <Text accessibilityLiveRegion="polite" className="text-body text-danger">
            {formError}
          </Text>
        ) : null}
        <Button disabled={saving} label={t("firstVehicle.addAction")} onPress={() => void save()} />
      </Card>
    </Screen>
  );
}

const measurementSystem = getLocales()[0]?.measurementSystem;
const defaultDistanceUnit: DistanceUnit = measurementSystem === "us" ? "miles" : "kilometres";
const defaultFuelVolumeUnit: VolumeUnit =
  measurementSystem === "us"
    ? "usGallons"
    : measurementSystem === "uk"
      ? "imperialGallons"
      : "litres";
const defaultFuelConsumptionUnit: FuelConsumptionUnit =
  measurementSystem === "us"
    ? "milesPerUsGallon"
    : measurementSystem === "uk"
      ? "milesPerImperialGallon"
      : "litresPer100Kilometres";

function parseOptionalInteger(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

function parseDistance(value: string, unit: DistanceUnit): number | undefined {
  if (value.trim() === "") return undefined;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  const numeric = Number(value);
  return distanceToMetres(numeric, unit);
}

function formatDistance(metres: number, unit: DistanceUnit): string {
  return String(Math.round(metresToDistance(metres, unit)));
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

function formatFuelCapacity(value: Microlitres, unit: VolumeUnit): string {
  return String(Math.round(microlitresToVolume(value, unit)));
}

function mapValidationIssues(
  issues: readonly ValidationIssue[],
  t: (key: string) => string,
): FieldErrors {
  return Object.fromEntries(
    issues.map((issue) => {
      if (issue.field === "vin") return [issue.field, t("firstVehicle.vinError")];
      if (issue.field === "manufactureYear") return [issue.field, t("firstVehicle.yearError")];
      if (issue.field === "initialOdometerMetres") {
        return [issue.field, t("firstVehicle.invalidNumberError")];
      }
      if (issue.field === "fuelTankCapacityMicrolitres") {
        return [issue.field, t("firstVehicle.fuelTankCapacityError")];
      }
      return [issue.field, t("firstVehicle.requiredError")];
    }),
  );
}

async function persistFirstVehicle({
  managedFiles,
  photo,
  vehicle,
  vehicles,
}: Readonly<{
  managedFiles: Pick<ManagedFileCoordinator, "import" | "remove">;
  photo: SelectedPhoto | null;
  vehicle: Vehicle;
  vehicles: VehicleRepository;
}>): Promise<"created" | "photo-error" | "vehicle-error"> {
  let importedPhoto = false;
  try {
    if (photo && vehicle.photoReference) {
      const imported = await managedFiles.import({
        kind: "vehicle-photo",
        managedFileId: vehicle.photoReference,
        mimeType: photo.mimeType,
        originalName: photo.originalName,
        sourceUri: photo.uri,
      });
      if (!imported.ok) return "photo-error";
      importedPhoto = true;
    }

    const created = await vehicles.create(vehicle);
    if (created.ok) return "created";
  } catch {
    // A native storage or database exception is exposed as a retryable form error below.
  }

  try {
    if (importedPhoto && vehicle.photoReference) await managedFiles.remove(vehicle.photoReference);
  } catch {
    // Startup reconciliation removes a ready vehicle photo left without a vehicle reference.
  }
  return "vehicle-error";
}
