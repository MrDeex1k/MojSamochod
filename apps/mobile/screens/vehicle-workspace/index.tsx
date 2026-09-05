import { ScrollPositionProvider } from "@/components/layout/scroll-positions";
import { BackHandler } from "react-native";
import { DataManagement } from "./data-management";
import { WorkspaceDataSource, workspaceSection } from "./workspace-data-source";
import { PhoneWorkspace, VehicleSummary, HistoryCard } from "./workspace-history";
import {
  NavigationGuardProvider,
  useGuardedNavigation,
} from "@/components/layout/navigation-guard";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { hasFuelConfiguration } from "@/domain/vehicle/vehicle";
import { AdaptiveWorkspace } from "@/components/layout/adaptive-workspace";
import { Screen } from "@/components/layout/screen";
import { useApplicationServices } from "@/components/providers/application-provider";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/localization/use-app-translation";

import { EntryForm } from "./entry-form";
import { EntryDetail } from "./entry-detail";
import { EntryTypeSelection } from "./entry-type-selection";
import { VehicleEditForm } from "./vehicle-edit-form";
import { DocumentDetail } from "./document-detail";
import { DocumentForm } from "./document-form";
import { DocumentList } from "./document-list";
import { RefuellingDetail } from "./refuelling-detail";
import { RefuellingForm } from "./refuelling-form";
import { RefuellingList } from "./refuelling-list";
import { RemindersSection } from "./reminders-section";

import type { WorkspaceData, WorkspaceMode, VehicleWorkspaceViewProps } from "./workspace-types";
export function VehicleWorkspaceScreen() {
  return (
    <NavigationGuardProvider>
      <ScrollPositionProvider>
        <VehicleWorkspaceController />
      </ScrollPositionProvider>
    </NavigationGuardProvider>
  );
}

function VehicleWorkspaceController() {
  const navigate = useGuardedNavigation();
  const services = useApplicationServices();
  const [source] = useState(() => new WorkspaceDataSource(services));
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<WorkspaceMode>({ kind: "history" });
  const [state, setState] = useState<
    | Readonly<{ data: WorkspaceData; status: "ready" }>
    | Readonly<{ status: "error" }>
    | Readonly<{ status: "loading" }>
    | Readonly<{ status: "missing" }>
  >({ status: "loading" });

  const [loadingMore, setLoadingMore] = useState(false);
  const section = workspaceSection(mode);
  const loadMore = async () => {
    if (loadingMore || !source.hasMore()) return;
    setLoadingMore(true);
    try {
      await source.loadMore();
      setAttempt((value) => value + 1);
    } catch {
      setState({ status: "error" });
    }
    setLoadingMore(false);
  };
  useEffect(() => {
    let active = true;
    void source.load(section).then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [attempt, section, source]);

  useEffect(() => {
    if (
      mode.kind === "history" ||
      mode.kind.includes("form") ||
      mode.kind === "reminders" ||
      mode.kind === "data-management"
    )
      return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      navigate(() =>
        setMode({
          kind:
            mode.kind === "document-detail"
              ? "documents"
              : mode.kind === "refuelling-detail"
                ? "fuel"
                : "history",
        }),
      );
      return true;
    });
    return () => subscription.remove();
  }, [mode.kind, navigate]);

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
        {section !== "history" ? (
          <Button
            label={t("documents.back")}
            variant="secondary"
            onPress={() => setMode({ kind: "history" })}
          />
        ) : null}
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
      onErased={() => setState({ status: "missing" })}
      onLoadMore={
        source.hasMore() && !loadingMore
          ? () => {
              void loadMore();
            }
          : undefined
      }
      onDataManagement={() => navigate(() => setMode({ kind: "data-management" }))}
      onAddEntry={() => navigate(() => setMode({ kind: "select-type" }))}
      onAddRefuelling={() => navigate(() => setMode({ kind: "refuelling-form" }))}
      onAddDocument={() => navigate(() => setMode({ kind: "document-form" }))}
      onCancelFlow={() => navigate(() => setMode({ kind: "history" }))}
      onChooseType={(type) => navigate(() => setMode({ kind: "form", type }))}
      onConfigureFuel={() => navigate(() => setMode({ kind: "vehicle-form", returnTo: "fuel" }))}
      onDocuments={() => navigate(() => setMode({ kind: "documents" }))}
      onDocumentsChanged={() => {
        source.invalidate("documents");
        setMode({ kind: "documents" });
        setAttempt((value) => value + 1);
      }}
      onEditDocument={(document) => navigate(() => setMode({ document, kind: "document-form" }))}
      onEditEntry={(entry) => navigate(() => setMode({ entry, kind: "form", type: entry.type }))}
      onEditRefuelling={(refuelling) =>
        navigate(() => setMode({ kind: "refuelling-form", refuelling }))
      }
      onEditVehicle={() => {
        if (mode.kind !== "vehicle-form")
          navigate(() => setMode({ kind: "vehicle-form", returnTo: "history" }));
      }}
      onFuel={() => navigate(() => setMode({ kind: "fuel" }))}
      onReminders={() => navigate(() => setMode({ kind: "reminders" }))}
      onFuelChanged={() => {
        source.invalidate("fuel");
        setMode({ kind: "fuel" });
        setAttempt((value) => value + 1);
      }}
      onSaved={() => {
        source.invalidate("history");
        setMode({ kind: "history" });
        setAttempt((value) => value + 1);
      }}
      onSelectEntry={(entry) => navigate(() => setMode({ entry, kind: "detail" }))}
      onSelectRefuelling={(refuelling) =>
        navigate(() => setMode({ kind: "refuelling-detail", refuelling }))
      }
      onSelectDocument={(document) =>
        navigate(() => setMode({ document, kind: "document-detail" }))
      }
      services={services}
    />
  );
}

export function VehicleWorkspaceView(props: VehicleWorkspaceViewProps) {
  if (props.mode.kind === "data-management")
    return (
      <DataManagement
        eraseData={props.services.eraseData}
        onBack={props.onCancelFlow}
        onErased={props.onErased}
      />
    );
  if (props.mode.kind === "reminders") {
    const { services, vehicle, onCancelFlow, onEditVehicle, photoUri } = props;
    return (
      <AdaptiveWorkspace
        phone={<RemindersSection {...services} vehicle={vehicle} onBack={onCancelFlow} />}
        primaryPane={
          <RemindersSection {...services} vehicle={vehicle} onBack={onCancelFlow} embedded />
        }
        vehiclePane={
          <VehicleSummary onEdit={onEditVehicle} photoUri={photoUri} tablet vehicle={vehicle} />
        }
      />
    );
  }
  return <HistoryWorkspaceView {...props} />;
}

function HistoryWorkspaceView({
  documents,
  entries,
  mode,
  onAddEntry,
  onDataManagement,
  onLoadMore,
  onAddRefuelling,
  onAddDocument,
  onCancelFlow,
  onChooseType,
  onConfigureFuel,
  onDocuments,
  onDocumentsChanged,
  onEditDocument,
  onEditEntry,
  onEditRefuelling,
  onEditVehicle,
  onFuel,
  onReminders,
  onFuelChanged,
  onSaved,
  onSelectEntry,
  onSelectRefuelling,
  onSelectDocument,
  photoUri,
  refuellingHistory,
  services,
  vehicle,
}: VehicleWorkspaceViewProps) {
  const configuredVehicle = hasFuelConfiguration(vehicle) ? vehicle : undefined;
  const phone =
    mode.kind === "fuel" ? (
      <RefuellingList
        history={refuellingHistory}
        onAdd={onAddRefuelling}
        onBack={onCancelFlow}
        onConfigureFuel={onConfigureFuel}
        onSelect={onSelectRefuelling}
        vehicle={vehicle}
      />
    ) : mode.kind === "refuelling-form" && configuredVehicle ? (
      <RefuellingForm
        clock={services.clock}
        onCancel={onFuel}
        onSaved={onFuelChanged}
        refuelling={mode.refuelling}
        refuellings={services.refuellings}
        vehicle={configuredVehicle}
      />
    ) : mode.kind === "refuelling-detail" && configuredVehicle ? (
      <RefuellingDetail
        onBack={onFuel}
        onDeleted={onFuelChanged}
        onEdit={() => onEditRefuelling(mode.refuelling)}
        refuelling={mode.refuelling}
        refuellings={services.refuellings}
        vehicle={configuredVehicle}
      />
    ) : mode.kind === "documents" ? (
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
        key={mode.document.id}
        document={mode.document}
        documents={services.documents}
        entries={entries}
        onBack={onDocuments}
        onChanged={onDocumentsChanged}
        onEdit={() => onEditDocument(mode.document)}
        picker={services.documentPicker}
        vehicle={vehicle}
      />
    ) : mode.kind === "vehicle-form" ? (
      <VehicleEditForm
        {...services}
        existingPhotoUri={photoUri}
        onCancel={mode.returnTo === "fuel" ? onFuel : onCancelFlow}
        onSaved={mode.returnTo === "fuel" ? onFuelChanged : onSaved}
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
        onLoadMore={onLoadMore}
        onDataManagement={onDataManagement}
        onAddEntry={onAddEntry}
        onEditVehicle={onEditVehicle}
        onFuel={onFuel}
        onReminders={onReminders}
        onDocuments={onDocuments}
        onSelectEntry={onSelectEntry}
        photoUri={photoUri}
        vehicle={vehicle}
      />
    );

  const primaryPane =
    mode.kind === "fuel" || mode.kind === "refuelling-detail" ? (
      <RefuellingList
        embedded
        history={refuellingHistory}
        onAdd={onAddRefuelling}
        onBack={onCancelFlow}
        onConfigureFuel={onConfigureFuel}
        onSelect={onSelectRefuelling}
        vehicle={vehicle}
      />
    ) : mode.kind === "refuelling-form" && configuredVehicle ? (
      <RefuellingForm
        clock={services.clock}
        embedded
        onCancel={onFuel}
        onSaved={onFuelChanged}
        refuelling={mode.refuelling}
        refuellings={services.refuellings}
        vehicle={configuredVehicle}
      />
    ) : mode.kind === "documents" || mode.kind === "document-detail" ? (
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
        onCancel={mode.returnTo === "fuel" ? onFuel : onCancelFlow}
        onSaved={mode.returnTo === "fuel" ? onFuelChanged : onSaved}
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
        onLoadMore={onLoadMore}
        onDataManagement={onDataManagement}
        onAddEntry={onAddEntry}
        onDocuments={onDocuments}
        onFuel={onFuel}
        onReminders={onReminders}
        onSelectEntry={onSelectEntry}
        vehicle={vehicle}
      />
    );

  const detailPane =
    mode.kind === "refuelling-detail" && configuredVehicle ? (
      <RefuellingDetail
        embedded
        onBack={onFuel}
        onDeleted={onFuelChanged}
        onEdit={() => onEditRefuelling(mode.refuelling)}
        refuelling={mode.refuelling}
        refuellings={services.refuellings}
        vehicle={configuredVehicle}
      />
    ) : mode.kind === "document-detail" ? (
      <DocumentDetail
        key={mode.document.id}
        document={mode.document}
        documents={services.documents}
        embedded
        entries={entries}
        onBack={onDocuments}
        onChanged={onDocumentsChanged}
        onEdit={() => onEditDocument(mode.document)}
        picker={services.documentPicker}
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
