import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ListScreen } from "@/components/layout/list-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { distanceUnitLabel, metresToDistance } from "@/domain/vehicle/distance";
import { useAppTranslation } from "@/localization/use-app-translation";
import {
  formatCurrencyMinorUnits,
  formatLocalizedNumber,
  formatUtcDateTime,
} from "@/localization/formatters";
import type { VehicleWorkspaceViewProps } from "./workspace-types";

export function PhoneWorkspace(
  props: Pick<
    VehicleWorkspaceViewProps,
    | "onLoadMore"
    | "onDataManagement"
    | "entries"
    | "onAddEntry"
    | "onDocuments"
    | "onEditVehicle"
    | "onFuel"
    | "onReminders"
    | "onSelectEntry"
    | "photoUri"
    | "vehicle"
  >,
) {
  const { t } = useAppTranslation();
  return (
    <HistoryList
      onLoadMore={props.onLoadMore}
      entries={props.entries}
      onAddEntry={props.onAddEntry}
      onSelectEntry={props.onSelectEntry}
      vehicle={props.vehicle}
      header={
        <View className="gap-content">
          <VehicleSummary {...props} />
          <Button
            label={t("dataManagement.title")}
            onPress={props.onDataManagement}
            variant="secondary"
          />
          <Button label={`+ ${t("workspace.addEntry")}`} onPress={props.onAddEntry} />
          <Button label={t("documents.title")} onPress={props.onDocuments} variant="secondary" />
          <Button label={t("refuelling.title")} onPress={props.onFuel} variant="secondary" />
          <Button label={t("reminders.title")} onPress={props.onReminders} variant="secondary" />
          <Button
            label={t("workspace.editVehicle")}
            onPress={props.onEditVehicle}
            variant="secondary"
          />
        </View>
      }
    />
  );
}

export function VehicleSummary({
  photoUri,
  onEdit,
  tablet = false,
  vehicle,
}: Pick<VehicleWorkspaceViewProps, "photoUri" | "vehicle"> & {
  onEdit?: () => void;
  tablet?: boolean;
}) {
  const { t, i18n } = useAppTranslation();
  const mileage = formatDistance(vehicle, i18n.language);
  const photoDescription = t("workspace.photoDescription", {
    make: vehicle.make,
    model: vehicle.model,
  });

  return (
    <Card className={tablet ? "h-full" : undefined}>
      {tablet ? (
        <Text accessibilityRole="header" className="text-title font-bold text-primary">
          {vehicle.make} {vehicle.model}
        </Text>
      ) : null}
      <View className="relative aspect-square w-full overflow-hidden rounded-control bg-surface-muted">
        {photoUri ? (
          <Image
            accessibilityLabel={photoDescription}
            className="h-full w-full"
            contentFit="cover"
            source={{ uri: photoUri }}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Text className="text-body text-secondary">{t("workspace.photo")}</Text>
          </View>
        )}
        {!tablet && mileage ? (
          <View className="absolute right-compact top-compact rounded-compact bg-canvas/80 px-control py-compact">
            <Text className="text-body font-semibold text-primary">{mileage}</Text>
          </View>
        ) : null}
      </View>
      {tablet ? (
        <View className="gap-compact">
          {vehicle.variant ? (
            <Text className="text-body text-secondary">{vehicle.variant}</Text>
          ) : null}
          <Text className="text-heading font-semibold text-primary">
            {mileage ?? t("workspace.noMileage")}
          </Text>
          {onEdit ? (
            <Button label={t("workspace.editVehicle")} onPress={onEdit} variant="secondary" />
          ) : null}
        </View>
      ) : (
        <View className="flex-row items-start justify-between gap-content">
          <Text accessibilityRole="header" className="flex-1 text-title font-bold text-primary">
            {vehicle.make} {vehicle.model}
          </Text>
          {vehicle.variant ? (
            <Text className="max-w-[45%] text-right text-body text-secondary">
              {vehicle.variant}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

export function HistoryCard({
  onLoadMore,
  onDataManagement,
  entries,
  onAddEntry,
  onDocuments,
  onFuel,
  onReminders,
  onSelectEntry,
  vehicle,
}: Pick<
  VehicleWorkspaceViewProps,
  | "onLoadMore"
  | "onDataManagement"
  | "entries"
  | "onAddEntry"
  | "onDocuments"
  | "onFuel"
  | "onReminders"
  | "onSelectEntry"
  | "vehicle"
>) {
  const { t } = useAppTranslation();
  return (
    <HistoryList
      onLoadMore={onLoadMore}
      embedded
      entries={entries}
      onAddEntry={onAddEntry}
      onSelectEntry={onSelectEntry}
      vehicle={vehicle}
      header={
        <View className="gap-content">
          <Button
            label={t("dataManagement.title")}
            onPress={onDataManagement}
            variant="secondary"
          />
          <Button label={`+ ${t("workspace.addEntry")}`} onPress={onAddEntry} />
          <Button label={t("documents.title")} onPress={onDocuments} variant="secondary" />
          <Button label={t("refuelling.title")} onPress={onFuel} variant="secondary" />
          <Button label={t("reminders.title")} onPress={onReminders} variant="secondary" />
        </View>
      }
    />
  );
}

function HistoryList({
  onLoadMore,
  entries,
  onAddEntry,
  onSelectEntry,
  vehicle,
  header,
  embedded = false,
}: Pick<
  VehicleWorkspaceViewProps,
  "onLoadMore" | "entries" | "onAddEntry" | "onSelectEntry" | "vehicle"
> & { header: ReactNode; embedded?: boolean }) {
  const { t } = useAppTranslation();
  return (
    <ListScreen
      scrollKey="history"
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      embedded={embedded}
      data={entries}
      keyExtractor={(entry) => entry.id}
      ListHeaderComponent={
        <View className="gap-content">
          {header}
          <Text accessibilityRole="header" className="text-title font-bold text-primary">
            {t("workspace.historyTitle")}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View className="gap-content">
          <Text className="text-heading font-semibold text-primary">
            {t("workspace.noEntries")}
          </Text>
          <Text className="text-body text-secondary">{t("workspace.historyDescription")}</Text>
          <Button label={t("workspace.addFirstEntry")} onPress={onAddEntry} variant="secondary" />
        </View>
      }
      renderItem={({ item }) => (
        <HistoryRow entry={item} onPress={() => onSelectEntry(item)} vehicle={vehicle} />
      )}
    />
  );
}

function HistoryRow({
  entry,
  onPress,
  vehicle,
}: Readonly<{ entry: HistoryEntry; onPress: () => void; vehicle: Vehicle }>) {
  const { t, i18n } = useAppTranslation();
  const title = `${t(`workspace.entryType.${entry.type}`)} — ${entrySubject(entry, t)}`;
  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole="button"
      className="gap-compact border-b border-divider py-control active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row justify-between gap-content">
        <Text className="flex-1 text-body font-semibold text-primary">{title}</Text>
        <Text className="text-caption text-secondary">
          {formatOccurredAt(entry, i18n.language)}
        </Text>
      </View>
      <View className="flex-row gap-content">
        {entry.odometerMetres === undefined ? null : (
          <Text className="text-caption text-secondary">
            {formatEntryDistance(entry.odometerMetres, vehicle, i18n.language)}
          </Text>
        )}
        {entry.cost ? (
          <Text className="text-caption text-secondary">
            {formatCurrencyMinorUnits(entry.cost.minorUnits, entry.cost.currency, i18n.language)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function entrySubject(entry: HistoryEntry, t: (key: string) => string): string {
  if (entry.type === "replacement") return entry.details.item;
  if (entry.type === "repair") return entry.details.subject;
  return entry.details.description ?? t(`entryForm.inspectionKinds.${entry.details.kind}`);
}

function formatEntryDistance(metres: number, vehicle: Vehicle, locale: string): string {
  const unit = vehicle.distanceUnitPreference;
  return `${formatLocalizedNumber(Math.round(metresToDistance(metres, unit)), locale)} ${distanceUnitLabel(unit)}`;
}

function formatOccurredAt(entry: HistoryEntry, locale: string): string {
  return formatUtcDateTime(entry.occurredAt, locale);
}

function formatDistance(vehicle: Vehicle, locale: string): string | null {
  if (vehicle.currentOdometerMetres === undefined) return null;
  const unit = vehicle.distanceUnitPreference;
  return `${formatLocalizedNumber(
    Math.round(metresToDistance(vehicle.currentOdometerMetres, unit)),
    locale,
  )} ${distanceUnitLabel(unit)}`;
}
