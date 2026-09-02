import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { HistoryEntry } from "@/domain/history/history-entry";
import { distanceUnitLabel, metresToDistance } from "@/domain/vehicle/distance";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import {
  formatCurrencyMinorUnits,
  formatLocalizedNumber,
  formatUtcDateTime,
} from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

export function EntryDetail({
  embedded = false,
  entry,
  historyEntries,
  onBack,
  onDeleted,
  onEdit,
  vehicle,
}: Readonly<{
  embedded?: boolean;
  entry: HistoryEntry;
  historyEntries: HistoryEntryRepository;
  onBack: () => void;
  onDeleted: () => void;
  onEdit: () => void;
  vehicle: Vehicle;
}>) {
  const { t, i18n } = useAppTranslation();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const subject = entrySubject(entry, t);

  const confirmDelete = () => {
    Alert.alert(
      t("entryDetail.deleteTitle", { entry: subject }),
      t("entryDetail.deleteDescription"),
      [
        { style: "cancel", text: t("entryForm.cancel") },
        {
          onPress: () => {
            setDeleting(true);
            setError(false);
            void historyEntries
              .delete(vehicle.id, entry.id)
              .then((result) => {
                if (result.ok) onDeleted();
                else setError(true);
              })
              .catch(() => setError(true))
              .finally(() => setDeleting(false));
          },
          style: "destructive",
          text: t("entryDetail.delete"),
        },
      ],
    );
  };

  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text className="text-label font-semibold uppercase tracking-widest text-accent">
        {t(`workspace.entryType.${entry.type}`)}
      </Text>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {subject}
      </Text>
      <View className="gap-compact border-t border-divider pt-content">
        <DetailRow
          label={t("entryDetail.dateTime")}
          value={formatUtcDateTime(entry.occurredAt, i18n.language)}
        />
        {entry.odometerMetres === undefined ? null : (
          <DetailRow
            label={t("entryDetail.odometer")}
            value={formatOdometer(entry.odometerMetres, vehicle, i18n.language)}
          />
        )}
        {entry.cost ? (
          <DetailRow
            label={t("entryDetail.cost")}
            value={formatCurrencyMinorUnits(
              entry.cost.minorUnits,
              entry.cost.currency,
              i18n.language,
            )}
          />
        ) : null}
        {entry.serviceProvider ? (
          <DetailRow label={t("entryDetail.serviceProvider")} value={entry.serviceProvider} />
        ) : null}
        <TypeDetails entry={entry} />
        {entry.notes ? <DetailRow label={t("entryDetail.notes")} value={entry.notes} /> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {t("entryDetail.deleteError")}
        </Text>
      ) : null}
      <Button label={t("entryDetail.edit")} onPress={onEdit} />
      <Button
        className="w-1/2 self-start"
        disabled={deleting}
        label={t("entryDetail.delete")}
        onPress={confirmDelete}
        variant="danger"
      />
      {!embedded ? (
        <Button label={t("entryDetail.back")} onPress={onBack} variant="secondary" />
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

function TypeDetails({ entry }: Readonly<{ entry: HistoryEntry }>) {
  const { t } = useAppTranslation();
  if (entry.type === "inspection") {
    return (
      <>
        <DetailRow
          label={t("entryDetail.inspectionKind")}
          value={t(`entryForm.inspectionKinds.${entry.details.kind}`)}
        />
        <DetailRow
          label={t("entryDetail.inspectionResult")}
          value={t(`entryForm.inspectionResults.${entry.details.result}`)}
        />
        {entry.details.description ? (
          <DetailRow label={t("entryDetail.description")} value={entry.details.description} />
        ) : null}
      </>
    );
  }
  if (entry.type === "replacement") {
    return (
      <>
        {entry.details.manufacturer ? (
          <DetailRow label={t("entryDetail.manufacturer")} value={entry.details.manufacturer} />
        ) : null}
        {entry.details.partNumber ? (
          <DetailRow label={t("entryDetail.partNumber")} value={entry.details.partNumber} />
        ) : null}
      </>
    );
  }
  return entry.details.description ? (
    <DetailRow label={t("entryDetail.description")} value={entry.details.description} />
  ) : null;
}

function entrySubject(entry: HistoryEntry, t: (key: string) => string): string {
  if (entry.type === "replacement") return entry.details.item;
  if (entry.type === "repair") return entry.details.subject;
  return entry.details.description ?? t(`entryForm.inspectionKinds.${entry.details.kind}`);
}

function formatOdometer(metres: number, vehicle: Vehicle, locale: string): string {
  const unit = vehicle.distanceUnitPreference;
  return `${formatLocalizedNumber(Math.round(metresToDistance(metres, unit)), locale)} ${distanceUnitLabel(unit)}`;
}
