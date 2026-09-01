import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { FuelConsumptionUnit } from "@/domain/refuelling/fuel-consumption";
import type { VolumeUnit } from "@/domain/refuelling/volume";
import { useAppTranslation } from "@/localization/use-app-translation";

export function FuelConfigurationFields({
  capacity,
  capacityError,
  consumptionUnit,
  onCapacityChange,
  onConsumptionUnitChange,
  onVolumeUnitChange,
  volumeUnit,
}: Readonly<{
  capacity: string;
  capacityError?: string;
  consumptionUnit: FuelConsumptionUnit;
  onCapacityChange: (value: string) => void;
  onConsumptionUnitChange: (value: FuelConsumptionUnit) => void;
  onVolumeUnitChange: (value: VolumeUnit) => void;
  volumeUnit: VolumeUnit;
}>) {
  const { t } = useAppTranslation();

  return (
    <View className="gap-content">
      <Text className="text-heading font-semibold text-primary">
        {t("firstVehicle.fuelSettingsLabel")}
      </Text>
      <TextField
        error={capacityError}
        keyboardType="decimal-pad"
        label={t("firstVehicle.fuelTankCapacityLabel")}
        onChangeText={onCapacityChange}
        value={capacity}
      />
      <Text className="text-label font-semibold text-primary">
        {t("firstVehicle.fuelVolumeUnitLabel")}
      </Text>
      <View className="flex-row gap-compact">
        <UnitButton
          label="l"
          onPress={() => onVolumeUnitChange("litres")}
          selected={volumeUnit === "litres"}
        />
        <UnitButton
          label="US gal"
          onPress={() => onVolumeUnitChange("usGallons")}
          selected={volumeUnit === "usGallons"}
        />
        <UnitButton
          label="Imp gal"
          onPress={() => onVolumeUnitChange("imperialGallons")}
          selected={volumeUnit === "imperialGallons"}
        />
      </View>
      <Text className="text-label font-semibold text-primary">
        {t("firstVehicle.fuelConsumptionUnitLabel")}
      </Text>
      <View className="flex-row gap-compact">
        <UnitButton
          label="l/100 km"
          onPress={() => onConsumptionUnitChange("litresPer100Kilometres")}
          selected={consumptionUnit === "litresPer100Kilometres"}
        />
        <UnitButton
          label="mpg US"
          onPress={() => onConsumptionUnitChange("milesPerUsGallon")}
          selected={consumptionUnit === "milesPerUsGallon"}
        />
        <UnitButton
          label="mpg Imp"
          onPress={() => onConsumptionUnitChange("milesPerImperialGallon")}
          selected={consumptionUnit === "milesPerImperialGallon"}
        />
      </View>
    </View>
  );
}

function UnitButton({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; onPress: () => void; selected: boolean }>) {
  return (
    <Button
      accessibilityState={{ selected }}
      className="flex-1 px-compact"
      label={label}
      onPress={onPress}
      variant={selected ? "primary" : "secondary"}
    />
  );
}
