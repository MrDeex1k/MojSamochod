import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { ApplicationServices } from "@/components/providers/application-provider";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { AdaptiveWorkspace } from "@/components/layout/adaptive-workspace";
import { Screen } from "@/components/layout/screen";
import { useApplicationServices } from "@/components/providers/application-provider";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { useAppTranslation } from "@/localization/use-app-translation";
import {
  formatCurrencyMinorUnits,
  formatLocalizedNumber,
  formatUtcDateTime,
} from "@/localization/formatters";

import { EntryForm } from "./entry-form";
import { EntryDetail } from "./entry-detail";
import { EntryTypeSelection } from "./entry-type-selection";
import { VehicleEditForm } from "./vehicle-edit-form";
import { DocumentDetail } from "./document-detail";
import { DocumentForm } from "./document-form";
import { DocumentList } from "./document-list";

type WorkspaceData = Readonly<{
  documents: readonly VehicleDocument[];
  entries: readonly HistoryEntry[];
  photoUri: string | null;
  vehicle: Vehicle;
}>;

type WorkspaceMode =
  | Readonly<{ document: VehicleDocument; kind: "document-detail" }>
  | Readonly<{ document?: VehicleDocument; kind: "document-form" }>
  | Readonly<{ kind: "documents" }>
  | Readonly<{ entry: HistoryEntry; kind: "detail" }>
  | Readonly<{ entry?: HistoryEntry; kind: "form"; type: HistoryEntry["type"] }>
  | Readonly<{ kind: "history" }>
  | Readonly<{ kind: "select-type" }>
  | Readonly<{ kind: "vehicle-form" }>;

type VehicleWorkspaceViewProps = WorkspaceData &
  Readonly<{
    mode: WorkspaceMode;
    onAddEntry: () => void;
    onAddDocument: () => void;
    onCancelFlow: () => void;
    onChooseType: (type: HistoryEntry["type"]) => void;
    onDocuments: () => void;
    onDocumentsChanged: () => void;
    onEditDocument: (document: VehicleDocument) => void;
    onEditEntry: (entry: HistoryEntry) => void;
    onEditVehicle: () => void;
    onSaved: () => void;
    onSelectEntry: (entry: HistoryEntry) => void;
    onSelectDocument: (document: VehicleDocument) => void;
    services: ApplicationServices;
  }>;

export function VehicleWorkspaceScreen() {
  const services = useApplicationServices();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<WorkspaceMode>({ kind: "history" });
  const [state, setState] = useState<
    | Readonly<{ data: WorkspaceData; status: "ready" }>
    | Readonly<{ status: "error" }>
    | Readonly<{ status: "loading" }>
    | Readonly<{ status: "missing" }>
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    void loadWorkspace(services).then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [attempt, services]);

  if (state.status === "missing") return <Redirect href="/" />;
  if (state.status === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t("workspace.errorDescription")}
          onAction={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
          title={t("workspace.errorTitle")}
        />
      </Screen>
    );
  }
  if (state.status === "loading") {
    return (
      <Screen contentClassName="items-center justify-center">
        <LoadingState label={t("workspace.loading")} />
      </Screen>
    );
  }

  return (
    <VehicleWorkspaceView
      {...state.data}
      mode={mode}
      onAddEntry={() => setMode({ kind: "select-type" })}
      onAddDocument={() => setMode({ kind: "document-form" })}
      onCancelFlow={() => setMode({ kind: "history" })}
      onChooseType={(type) => setMode({ kind: "form", type })}
      onDocuments={() => setMode({ kind: "documents" })}
      onDocumentsChanged={() => {
        setMode({ kind: "documents" });
        setState({ status: "loading" });
        setAttempt((value) => value + 1);
      }}
      onEditDocument={(document) => setMode({ document, kind: "document-form" })}
      onEditEntry={(entry) => setMode({ entry, kind: "form", type: entry.type })}
      onEditVehicle={() => setMode({ kind: "vehicle-form" })}
      onSaved={() => {
        setMode({ kind: "history" });
        setState({ status: "loading" });
        setAttempt((value) => value + 1);
      }}
      onSelectEntry={(entry) => setMode({ entry, kind: "detail" })}
      onSelectDocument={(document) => setMode({ document, kind: "document-detail" })}
      services={services}
    />
  );
}

export function VehicleWorkspaceView({
  documents,
  entries,
  mode,
  onAddEntry,
  onAddDocument,
  onCancelFlow,
  onChooseType,
  onDocuments,
  onDocumentsChanged,
  onEditDocument,
  onEditEntry,
  onEditVehicle,
  onSaved,
  onSelectEntry,
  onSelectDocument,
  photoUri,
  services,
  vehicle,
}: VehicleWorkspaceViewProps) {
  const phone =
    mode.kind === "documents" ? (
      <DocumentList
        documents={documents}
        entries={entries}
        onAdd={onAddDocument}
        onBack={onCancelFlow}
        onSelect={onSelectDocument}
      />
    ) : mode.kind === "document-form" ? (
      <DocumentForm
        document={mode.document}
        documents={services.documents}
        entries={entries}
        onCancel={onDocuments}
        onSaved={onDocumentsChanged}
        picker={services.documentPicker}
        vehicle={vehicle}
      />
    ) : mode.kind === "document-detail" ? (
      <DocumentDetail
        document={mode.document}
        documents={services.documents}
        entries={entries}
        onBack={onDocuments}
        onChanged={onDocumentsChanged}
        onEdit={() => onEditDocument(mode.document)}
        picker={services.documentPicker}
        presenter={services.documentPresenter}
        vehicle={vehicle}
      />
    ) : mode.kind === "vehicle-form" ? (
      <VehicleEditForm
        {...services}
        existingPhotoUri={photoUri}
        onCancel={onCancelFlow}
        onSaved={onSaved}
        vehicle={vehicle}
      />
    ) : mode.kind === "select-type" ? (
      <EntryTypeSelection onCancel={onCancelFlow} onSelect={onChooseType} />
    ) : mode.kind === "form" ? (
      <EntryForm
        {...services}
        entry={mode.entry}
        onCancel={onCancelFlow}
        onSaved={onSaved}
        type={mode.type}
        vehicle={vehicle}
      />
    ) : mode.kind === "detail" ? (
      <EntryDetail
        entry={mode.entry}
        historyEntries={services.historyEntries}
        onBack={onCancelFlow}
        onDeleted={onSaved}
        onEdit={() => onEditEntry(mode.entry)}
        vehicle={vehicle}
      />
    ) : (
      <PhoneWorkspace
        entries={entries}
        onAddEntry={onAddEntry}
        onEditVehicle={onEditVehicle}
        onDocuments={onDocuments}
        onSelectEntry={onSelectEntry}
        photoUri={photoUri}
        vehicle={vehicle}
      />
    );

  const primaryPane =
    mode.kind === "documents" || mode.kind === "document-detail" ? (
      <DocumentList
        documents={documents}
        embedded
        entries={entries}
        onAdd={onAddDocument}
        onBack={onCancelFlow}
        onSelect={onSelectDocument}
      />
    ) : mode.kind === "document-form" ? (
      <DocumentForm
        document={mode.document}
        documents={services.documents}
        embedded
        entries={entries}
        onCancel={onDocuments}
        onSaved={onDocumentsChanged}
        picker={services.documentPicker}
        vehicle={vehicle}
      />
    ) : mode.kind === "vehicle-form" ? (
      <VehicleEditForm
        {...services}
        embedded
        existingPhotoUri={photoUri}
        onCancel={onCancelFlow}
        onSaved={onSaved}
        vehicle={vehicle}
      />
    ) : mode.kind === "select-type" ? (
      <EntryTypeSelection embedded onCancel={onCancelFlow} onSelect={onChooseType} />
    ) : mode.kind === "form" ? (
      <EntryForm
        {...services}
        embedded
        entry={mode.entry}
        onCancel={onCancelFlow}
        onSaved={onSaved}
        type={mode.type}
        vehicle={vehicle}
      />
    ) : (
      <HistoryCard
        entries={entries}
        onAddEntry={onAddEntry}
        onDocuments={onDocuments}
        onSelectEntry={onSelectEntry}
        vehicle={vehicle}
      />
    );

  const detailPane =
    mode.kind === "document-detail" ? (
      <DocumentDetail
        document={mode.document}
        documents={services.documents}
        embedded
        entries={entries}
        onBack={onDocuments}
        onChanged={onDocumentsChanged}
        onEdit={() => onEditDocument(mode.document)}
        picker={services.documentPicker}
        presenter={services.documentPresenter}
        vehicle={vehicle}
      />
    ) : mode.kind === "detail" ? (
      <EntryDetail
        embedded
        entry={mode.entry}
        historyEntries={services.historyEntries}
        onBack={onCancelFlow}
        onDeleted={onSaved}
        onEdit={() => onEditEntry(mode.entry)}
        vehicle={vehicle}
      />
    ) : undefined;

  return (
    <AdaptiveWorkspace
      detailPane={detailPane}
      phone={phone}
      primaryPane={primaryPane}
      vehiclePane={
        <VehicleSummary onEdit={onEditVehicle} photoUri={photoUri} tablet vehicle={vehicle} />
      }
    />
  );
}

function PhoneWorkspace(
  props: Pick<
    VehicleWorkspaceViewProps,
    | "entries"
    | "onAddEntry"
    | "onDocuments"
    | "onEditVehicle"
    | "onSelectEntry"
    | "photoUri"
    | "vehicle"
  >,
) {
  const { t } = useAppTranslation();
  return (
    <Screen>
      <View className="gap-content">
        <VehicleSummary {...props} />
        <Button label={`+ ${t("workspace.addEntry")}`} onPress={props.onAddEntry} />
        <Button label={t("documents.title")} onPress={props.onDocuments} variant="secondary" />
        <HistoryContent
          entries={props.entries}
          onAddEntry={props.onAddEntry}
          onSelectEntry={props.onSelectEntry}
          vehicle={props.vehicle}
        />
        <Button
          label={t("workspace.editVehicle")}
          onPress={props.onEditVehicle}
          variant="secondary"
        />
      </View>
    </Screen>
  );
}

function VehicleSummary({
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

function HistoryCard({
  entries,
  onAddEntry,
  onDocuments,
  onSelectEntry,
  vehicle,
}: Pick<
  VehicleWorkspaceViewProps,
  "entries" | "onAddEntry" | "onDocuments" | "onSelectEntry" | "vehicle"
>) {
  const { t } = useAppTranslation();
  return (
    <Card className="h-full">
      <ScrollView contentContainerClassName="gap-content">
        <Button label={`+ ${t("workspace.addEntry")}`} onPress={onAddEntry} />
        <Button label={t("documents.title")} onPress={onDocuments} variant="secondary" />
        <HistoryContent
          entries={entries}
          onAddEntry={onAddEntry}
          onSelectEntry={onSelectEntry}
          vehicle={vehicle}
        />
      </ScrollView>
    </Card>
  );
}

function HistoryContent({
  entries,
  onAddEntry,
  onSelectEntry,
  vehicle,
}: Pick<VehicleWorkspaceViewProps, "entries" | "onAddEntry" | "onSelectEntry" | "vehicle">) {
  const { t } = useAppTranslation();
  return (
    <View className="gap-content">
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("workspace.historyTitle")}
      </Text>
      {entries.length === 0 ? (
        <View className="gap-content">
          <View className="gap-compact">
            <Text className="text-heading font-semibold text-primary">
              {t("workspace.noEntries")}
            </Text>
            <Text className="text-body text-secondary">{t("workspace.historyDescription")}</Text>
          </View>
          <Button label={t("workspace.addFirstEntry")} onPress={onAddEntry} variant="secondary" />
        </View>
      ) : (
        <View>
          {entries.map((entry) => (
            <HistoryRow
              entry={entry}
              key={entry.id}
              onPress={() => onSelectEntry(entry)}
              vehicle={vehicle}
            />
          ))}
        </View>
      )}
    </View>
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
  const divisor = vehicle.distanceUnitPreference === "kilometres" ? 1000 : 1609.344;
  const unit = vehicle.distanceUnitPreference === "kilometres" ? "km" : "mi";
  return `${formatLocalizedNumber(Math.round(metres / divisor), locale)} ${unit}`;
}

function formatOccurredAt(entry: HistoryEntry, locale: string): string {
  return formatUtcDateTime(entry.occurredAt, locale);
}

function formatDistance(vehicle: Vehicle, locale: string): string | null {
  if (vehicle.currentOdometerMetres === undefined) return null;
  const divisor = vehicle.distanceUnitPreference === "kilometres" ? 1000 : 1609.344;
  const unit = vehicle.distanceUnitPreference === "kilometres" ? "km" : "mi";
  return `${formatLocalizedNumber(Math.round(vehicle.currentOdometerMetres / divisor), locale)} ${unit}`;
}

async function loadWorkspace(
  services: ApplicationServices,
): Promise<
  Readonly<{ data: WorkspaceData; status: "ready" }> | Readonly<{ status: "error" | "missing" }>
> {
  const vehicleResult = await services.vehicles.get();
  if (!vehicleResult.ok) return { status: "error" };
  if (!vehicleResult.value) return { status: "missing" };
  const vehicle = vehicleResult.value;
  const entriesResult = await services.historyEntries.list(vehicle.id);
  if (!entriesResult.ok) return { status: "error" };
  const documentsResult = await services.documents.list(vehicle.id);
  if (!documentsResult.ok) return { status: "error" };
  let photoUri: string | null = null;
  if (vehicle.photoReference) {
    const photoResult = await services.managedFiles.getReadyUri(vehicle.photoReference);
    if (photoResult.ok) photoUri = photoResult.value;
  }
  return {
    data: { documents: documentsResult.value, entries: entriesResult.value, photoUri, vehicle },
    status: "ready",
  };
}
