import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import type { RefuellingService } from "@/application/refuelling/refuelling-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { formatCurrencyMinorUnits, formatUtcDateTime } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

import {
  formatFuelVolume,
  formatRefuellingOdometer,
  formatUnitPrice,
  volumeUnitLabel,
} from "./refuelling-presentation";

export function RefuellingDetail({
  embedded = false,
  onBack,
  onDeleted,
  onEdit,
  refuelling,
  refuellings,
  vehicle,
}: Readonly<{
  embedded?: boolean;
  onBack: () => void;
  onDeleted: () => void;
  onEdit: () => void;
  refuelling: Refuelling;
  refuellings: RefuellingService;
  vehicle: Vehicle;
}>) {
  const { t, i18n } = useAppTranslation();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const quantity = `${formatFuelVolume(
    refuelling.quantityMicrolitres,
    refuelling.inputVolumeUnit,
    i18n.language,
  )} ${volumeUnitLabel(refuelling.inputVolumeUnit)}`;

  const confirmDelete = () => {
    const odometer =
      refuelling.odometerMetres === undefined
        ? ""
        : `, ${formatRefuellingOdometer(refuelling.odometerMetres, vehicle, i18n.language)}`;
    Alert.alert(
      t("refuelling.deleteTitle"),
      t("refuelling.deleteDescription", {
        date: formatUtcDateTime(refuelling.occurredAt, i18n.language),
        odometer,
        quantity,
      }),
      [
        { style: "cancel", text: t("refuelling.cancel") },
        {
          onPress: () => {
            setDeleting(true);
            setError(false);
            void refuellings
              .delete(vehicle.id, refuelling.id)
              .then((result) => {
                if (result.ok) onDeleted();
                else setError(true);
              })
              .catch(() => setError(true))
              .finally(() => setDeleting(false));
          },
          style: "destructive",
          text: t("refuelling.delete"),
        },
      ],
    );
  };

  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text className="text-label font-semibold uppercase tracking-widest text-accent">
        {t(`refuelling.fillKind.${refuelling.fillKind}`)}
      </Text>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {quantity}
      </Text>
      <View className="gap-compact border-t border-divider pt-content">
        <DetailRow
          label={t("refuelling.dateTime")}
          value={`${formatUtcDateTime(refuelling.occurredAt, i18n.language)} UTC`}
        />
        <DetailRow label={t("refuelling.quantityLabel")} value={quantity} />
        <DetailRow
          label={t("refuelling.fillKindLabel")}
          value={t(`refuelling.fillKind.${refuelling.fillKind}`)}
        />
        {refuelling.odometerMetres === undefined ? null : (
          <DetailRow
            label={t("refuelling.odometerLabel")}
            value={formatRefuellingOdometer(refuelling.odometerMetres, vehicle, i18n.language)}
          />
        )}
        {refuelling.pricing ? (
          <>
            <DetailRow
              label={t("refuelling.totalPriceLabel")}
              value={formatCurrencyMinorUnits(
                refuelling.pricing.totalCost.minorUnits,
                refuelling.pricing.totalCost.currency,
                i18n.language,
              )}
            />
            <DetailRow
              label={t("refuelling.unitPriceLabel")}
              value={`${formatUnitPrice(refuelling.pricing.unitPriceMilliUnits, i18n.language)} ${
                refuelling.pricing.totalCost.currency
              }/${volumeUnitLabel(refuelling.pricing.unitPriceVolumeUnit)}`}
            />
            <DetailRow
              label={t("refuelling.enteredAs")}
              value={t(`refuelling.priceMode.${refuelling.pricing.inputMode}`)}
            />
          </>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {t("refuelling.deleteError")}
        </Text>
      ) : null}
      <Button label={t("refuelling.edit")} onPress={onEdit} />
      <Button
        className="w-1/2 self-start"
        disabled={deleting}
        label={t("refuelling.delete")}
        onPress={confirmDelete}
        variant="danger"
      />
      {!embedded ? (
        <Button label={t("refuelling.backToFuel")} onPress={onBack} variant="secondary" />
      ) : null}
    </Card>
  );

  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View className="flex-row justify-between gap-content py-compact">
      <Text className="flex-1 text-body text-secondary">{label}</Text>
      <Text className="flex-1 text-right text-body text-primary">{value}</Text>
    </View>
  );
}
