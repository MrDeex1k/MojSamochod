import { Pressable, ScrollView, Text, View } from "react-native";

import type { RefuellingHistory } from "@/application/refuelling/refuelling-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fuelConsumptionValue } from "@/domain/refuelling/fuel-consumption";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { formatCurrencyMinorUnits, formatUtcDateTime } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

import {
  formatFuelConsumption,
  formatFuelVolume,
  formatRefuellingOdometer,
  fuelConsumptionUnitLabel,
  volumeUnitLabel,
} from "./refuelling-presentation";

type RefuellingListProps = Readonly<{
  embedded?: boolean;
  history: RefuellingHistory;
  onAdd: () => void;
  onBack: () => void;
  onConfigureFuel: () => void;
  onSelect: (refuelling: Refuelling) => void;
  vehicle: Vehicle;
}>;

export function RefuellingList({
  embedded = false,
  history,
  onAdd,
  onBack,
  onConfigureFuel,
  onSelect,
  vehicle,
}: RefuellingListProps) {
  const { t } = useAppTranslation();
  const includedRefuellingIds = new Set(history.consumption.includedRefuellingIds);
  const content = (
    <Card className={embedded ? "h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("refuelling.title")}
      </Text>
      {vehicle.fuelTankCapacityMicrolitres === undefined ||
      vehicle.fuelConsumptionUnitPreference === undefined ||
      vehicle.fuelVolumeUnitPreference === undefined ? (
        <View className="gap-content">
          <Text className="text-body text-secondary">{t("refuelling.configurationRequired")}</Text>
          <Button label={t("refuelling.configureVehicle")} onPress={onConfigureFuel} />
        </View>
      ) : (
        <>
          <ConsumptionSummary history={history} vehicle={vehicle} />
          <Button label={`+ ${t("refuelling.add")}`} onPress={onAdd} />
          {history.refuellings.length === 0 ? (
            <View className="gap-compact">
              <Text className="text-heading font-semibold text-primary">
                {t("refuelling.empty")}
              </Text>
              <Text className="text-body text-secondary">{t("refuelling.emptyDescription")}</Text>
            </View>
          ) : (
            <View>
              {history.refuellings.map((refuelling) => (
                <RefuellingRow
                  included={includedRefuellingIds.has(refuelling.id)}
                  key={refuelling.id}
                  onPress={() => onSelect(refuelling)}
                  refuelling={refuelling}
                  vehicle={vehicle}
                />
              ))}
            </View>
          )}
        </>
      )}
      {!embedded ? (
        <Button label={t("refuelling.back")} onPress={onBack} variant="secondary" />
      ) : null}
    </Card>
  );

  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function ConsumptionSummary({
  history,
  vehicle,
}: Readonly<{ history: RefuellingHistory; vehicle: Vehicle }>) {
  const { t, i18n } = useAppTranslation();
  const unit = vehicle.fuelConsumptionUnitPreference!;
  const value = fuelConsumptionValue(history.consumption, unit);
  const invalidInterval = history.consumption.intervals.find(
    (interval) => interval.status === "invalid",
  );

  return (
    <View className="gap-compact rounded-control bg-surface-muted p-content">
      <Text className="text-label font-semibold uppercase tracking-widest text-accent">
        {t("refuelling.averageConsumption")}
      </Text>
      {value === undefined ? (
        <Text className="text-body text-secondary">
          {invalidInterval
            ? t(`refuelling.intervalReason.${invalidInterval.reason}`)
            : t("refuelling.awaitingConsumption")}
        </Text>
      ) : (
        <>
          <Text className="text-title font-bold text-primary">
            {formatFuelConsumption(value, i18n.language)} {fuelConsumptionUnitLabel(unit)}
          </Text>
          <Text className="text-caption text-secondary">
            {t("refuelling.basedOn", {
              recordCount: history.consumption.includedRefuellingIds.length,
            })}
          </Text>
          {invalidInterval ? (
            <Text accessibilityLiveRegion="polite" className="text-caption text-danger">
              {t(`refuelling.intervalReason.${invalidInterval.reason}`)}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function RefuellingRow({
  included,
  onPress,
  refuelling,
  vehicle,
}: Readonly<{
  included: boolean;
  onPress: () => void;
  refuelling: Refuelling;
  vehicle: Vehicle;
}>) {
  const { t, i18n } = useAppTranslation();
  const quantity = `${formatFuelVolume(
    refuelling.quantityMicrolitres,
    refuelling.inputVolumeUnit,
    i18n.language,
  )} ${volumeUnitLabel(refuelling.inputVolumeUnit)}`;
  return (
    <Pressable
      accessibilityLabel={`${t(`refuelling.fillKind.${refuelling.fillKind}`)}, ${quantity}`}
      accessibilityRole="button"
      className="gap-compact border-b border-divider py-control active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row justify-between gap-content">
        <Text className="flex-1 text-body font-semibold text-primary">{quantity}</Text>
        <Text className="text-caption text-secondary">
          {formatUtcDateTime(refuelling.occurredAt, i18n.language)}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-content">
        <Text className="text-caption text-secondary">
          {t(`refuelling.fillKind.${refuelling.fillKind}`)}
        </Text>
        {refuelling.odometerMetres === undefined ? null : (
          <Text className="text-caption text-secondary">
            {formatRefuellingOdometer(refuelling.odometerMetres, vehicle, i18n.language)}
          </Text>
        )}
        {refuelling.pricing ? (
          <Text className="text-caption text-secondary">
            {formatCurrencyMinorUnits(
              refuelling.pricing.totalCost.minorUnits,
              refuelling.pricing.totalCost.currency,
              i18n.language,
            )}
          </Text>
        ) : null}
      </View>
      {included ? (
        <Text className="text-caption font-semibold text-accent">
          {t("refuelling.includedInAverage")}
        </Text>
      ) : null}
    </Pressable>
  );
}
