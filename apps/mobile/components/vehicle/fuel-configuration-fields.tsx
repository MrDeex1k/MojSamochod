import { Text, View, useWindowDimensions } from "react-native";

import { ChoiceField } from "@/components/ui/choice-field";
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
  const { fontScale } = useWindowDimensions();

  return (
    <View className="gap-content">
      <Text className="text-heading font-semibold text-primary">
        {t("firstVehicle.fuelSettingsLabel")}
      </Text>
      <TextField
        error={capacityError}
        keyboardType="number-pad"
        label={t("firstVehicle.fuelTankCapacityLabel")}
        onChangeText={onCapacityChange}
        value={capacity}
      />
      <View className={fontScale > 1.3 ? "gap-content" : "flex-row gap-content"}>
        <View className="min-w-0 flex-1">
          <ChoiceField
            menu
            label={t("firstVehicle.fuelVolumeUnitLabel")}
            value={volumeUnit}
            onSelect={onVolumeUnitChange}
            options={[
              ["litres", "l"],
              ["usGallons", "US gal"],
              ["imperialGallons", "Imp gal"],
            ]}
          />
        </View>
        <View className="min-w-0 flex-1">
          <ChoiceField
            menu
            label={t("firstVehicle.fuelConsumptionUnitLabel")}
            value={consumptionUnit}
            onSelect={onConsumptionUnitChange}
            options={[
              ["litresPer100Kilometres", "l/100 km"],
              ["milesPerUsGallon", "mpg US"],
              ["milesPerImperialGallon", "mpg Imp"],
            ]}
          />
        </View>
      </View>
    </View>
  );
}
