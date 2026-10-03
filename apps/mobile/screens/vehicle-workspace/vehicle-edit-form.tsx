import { ChoiceField } from "@/components/ui/choice-field";
import { FormActions, FormTitle } from "@/components/layout/native-form";

import { ScrollView, Text, View } from "react-native";

import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Image } from "@/components/ui/image";
import { TextField } from "@/components/ui/text-field";
import { FuelConfigurationFields } from "@/components/vehicle/fuel-configuration-fields";

import type { Clock, IdGenerator } from "@/domain/shared/ports";

import { type Vehicle } from "@/domain/vehicle/vehicle";
import type { VehiclePhotoPicker } from "@/infrastructure/media/gallery-vehicle-photo-picker";

import { useVehicleEditForm } from "./use-vehicle-edit-form";

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
  const {
    changeInitialOdometer,
    changeFuelCapacity,
    t,
    make,
    setMake,
    model,
    setModel,
    variant,
    setVariant,
    manufactureYear,
    setManufactureYear,
    registrationNumber,
    setRegistrationNumber,
    vin,
    setVin,
    initialOdometer,
    distanceUnit,
    fuelVolumeUnit,
    fuelConsumptionUnit,
    setFuelConsumptionUnit,
    fuelTankCapacity,
    setPhotoChange,
    errors,
    formError,
    saving,
    cancel,
    photoUri,
    selectPhoto,
    changeDistanceUnit,
    changeFuelVolumeUnit,
    save,
  } = useVehicleEditForm({
    clock,
    embedded,
    existingPhotoUri,
    idGenerator,
    managedFiles,
    onCancel,
    onSaved,
    photoPicker,
    vehicle,
    vehicles,
  });
  const content = (
    <FormSection className={embedded ? "p-screen" : undefined}>
      <FormTitle>{t("vehicleEdit.title")}</FormTitle>
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
      <ChoiceField
        label={t("firstVehicle.distanceUnitLabel")}
        value={distanceUnit}
        onSelect={changeDistanceUnit}
        options={[
          ["kilometres", "km"],
          ["miles", "mi"],
        ]}
      />
      <TextField
        error={errors.initialOdometerMetres}
        keyboardType="number-pad"
        label={t("firstVehicle.initialOdometerLabel")}
        onChangeText={changeInitialOdometer}
        value={initialOdometer}
      />
      <FuelConfigurationFields
        capacity={fuelTankCapacity}
        capacityError={errors.fuelTankCapacityMicrolitres}
        consumptionUnit={fuelConsumptionUnit}
        onCapacityChange={changeFuelCapacity}
        onConsumptionUnitChange={setFuelConsumptionUnit}
        onVolumeUnitChange={changeFuelVolumeUnit}
        volumeUnit={fuelVolumeUnit}
      />
      {formError ? <Text className="text-body text-danger">{formError}</Text> : null}
      <FormActions
        busy={saving}
        saveLabel={t("vehicleEdit.save")}
        cancelLabel={t("vehicleEdit.cancel")}
        onSave={() => void save()}
        onCancel={cancel}
      />
    </FormSection>
  );

  return embedded ? (
    <ScrollView
      contentContainerClassName="grow"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
