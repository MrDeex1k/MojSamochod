import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ListScreen } from "@/components/layout/list-screen";
import { Button } from "@/components/ui/button";
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
    | "loadingMore"
    | "loadMoreError"
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
      loadMoreError={props.loadMoreError}
      loadingMore={props.loadingMore}
      entries={props.entries}
      onAddEntry={props.onAddEntry}
      onSelectEntry={props.onSelectEntry}
      vehicle={props.vehicle}
      header={
        <View className="gap-content">
          <VehicleSummary {...props} />
          <Button label={`+ ${t("workspace.addEntry")}`} onPress={props.onAddEntry} />
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
    <View className="flex-row items-center gap-content border-b border-divider pb-content">
      {photoUri ? (
        <Image
          accessibilityLabel={photoDescription}
          source={{ uri: photoUri }}
          contentFit="cover"
          style={{ width: tablet ? 96 : 64, height: tablet ? 96 : 64, borderRadius: 12 }}
        />
      ) : null}
      <View className="flex-1 gap-compact">
        <Text accessibilityRole="header" className="text-heading font-semibold text-primary">
          {vehicle.make} {vehicle.model}
        </Text>
        {vehicle.variant ? (
          <Text className="text-caption text-secondary">{vehicle.variant}</Text>
        ) : null}
        <Text
          className="text-body font-semibold text-primary"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {mileage ?? t("workspace.noMileage")}
        </Text>
        {tablet && onEdit ? (
          <Button label={t("workspace.editVehicle")} onPress={onEdit} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}

export function HistoryCard({
  selectedId,
  loadingMore,
  loadMoreError,
  onLoadMore,
  entries,
  onAddEntry,
  onSelectEntry,
  vehicle,
}: Pick<
  VehicleWorkspaceViewProps,
  | "onLoadMore"
  | "loadingMore"
  | "loadMoreError"
  | "onDataManagement"
  | "entries"
  | "onAddEntry"
  | "onDocuments"
  | "onFuel"
  | "onReminders"
  | "onSelectEntry"
  | "vehicle"
> & { selectedId?: string }) {
  const { t } = useAppTranslation();
  return (
    <HistoryList
      onLoadMore={onLoadMore}
      selectedId={selectedId}
      loadingMore={loadingMore}
      loadMoreError={loadMoreError}
      embedded
      entries={entries}
      onAddEntry={onAddEntry}
      onSelectEntry={onSelectEntry}
      vehicle={vehicle}
      header={<Button label={`+ ${t("workspace.addEntry")}`} onPress={onAddEntry} />}
    />
  );
}

function HistoryList({
  selectedId,
  loadingMore,
  loadMoreError,
  onLoadMore,
  entries,
  onAddEntry,
  onSelectEntry,
  vehicle,
  header,
  embedded = false,
}: Pick<
  VehicleWorkspaceViewProps,
  | "onLoadMore"
  | "loadingMore"
  | "loadMoreError"
  | "entries"
  | "onAddEntry"
  | "onSelectEntry"
  | "vehicle"
> & { header: ReactNode; embedded?: boolean; selectedId?: string }) {
  const { t } = useAppTranslation();
  return (
    <ListScreen
      scrollKey="history"
      onEndReached={loadMoreError ? undefined : onLoadMore}
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
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator accessibilityLabel={t("workspace.loading")} />
        ) : loadMoreError ? (
          <View className="gap-compact py-content">
            <Text accessibilityRole="alert" className="text-body text-secondary">
              {t("workspace.pageError")}
            </Text>
            <Button label={t("database.errorAction")} onPress={onLoadMore} variant="secondary" />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <HistoryRow
          selected={item.id === selectedId}
          entry={item}
          onPress={() => onSelectEntry(item)}
          vehicle={vehicle}
        />
      )}
    />
  );
}

function HistoryRow({
  selected,
  entry,
  onPress,
  vehicle,
}: Readonly<{ selected: boolean; entry: HistoryEntry; onPress: () => void; vehicle: Vehicle }>) {
  const { t, i18n } = useAppTranslation();
  const title = `${t(`workspace.entryType.${entry.type}`)} - ${entrySubject(entry, t)}`;
  const date = formatOccurredAt(entry, i18n.language);
  const distance =
    entry.odometerMetres === undefined
      ? null
      : formatEntryDistance(entry.odometerMetres, vehicle, i18n.language);
  const cost = entry.cost
    ? formatCurrencyMinorUnits(entry.cost.minorUnits, entry.cost.currency, i18n.language)
    : null;
  return (
    <Pressable
      accessibilityLabel={[title, date, distance, cost]
        .filter((value) => value !== null)
        .join(", ")}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={
        selected
          ? {
              backgroundColor: "#252527",
              borderLeftWidth: 3,
              borderLeftColor: "#72b48e",
              paddingLeft: 12,
            }
          : undefined
      }
      className="gap-compact border-b border-divider py-control active:opacity-70"
      onPress={onPress}
    >
      <View className="flex-row justify-between gap-content">
        <Text className="flex-1 text-body font-semibold text-primary">{title}</Text>
        <Text className="text-caption text-secondary">{date}</Text>
      </View>
      <View className="flex-row gap-content">
        {distance === null ? null : <Text className="text-caption text-secondary">{distance}</Text>}
        {cost !== null ? <Text className="text-caption text-secondary">{cost}</Text> : null}
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
