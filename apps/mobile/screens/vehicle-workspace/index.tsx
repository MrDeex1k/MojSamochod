import { DataManagement } from "./data-management";
import { workspaceSection } from "./workspace-data-source";
import { PhoneWorkspace } from "./workspace-history";
import { Redirect, router } from "expo-router";
import { useFinishNativeForm } from "@/components/layout/native-form-context";
import { useWorkspaceSource } from "./workspace-provider";
import { navigateToMode } from "./workspace-routing";
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
export function VehicleWorkspaceScreen({ mode }: { mode: WorkspaceMode }) {
  return <VehicleWorkspaceController mode={mode} />;
}

function VehicleWorkspaceController({ mode }: { mode: WorkspaceMode }) {
  const services = useApplicationServices();
  const { source, revision: attempt, refresh } = useWorkspaceSource();
  const navigate = (action: () => void) => action();
  const finish = useFinishNativeForm();
  const setAttempt = () => refresh();
  const setMode = (next: WorkspaceMode) => navigateToMode(next);
  const { t } = useAppTranslation();
  const [state, setState] = useState<
    | Readonly<{ data: WorkspaceData; status: "ready" }>
    | Readonly<{ status: "error" }>
    | Readonly<{ status: "loading" }>
    | Readonly<{ status: "missing" }>
  >({ status: "loading" });

  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const section = workspaceSection(mode);
  const loadMore = async () => {
    if (loadingMore || !source.hasMore(section)) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      await source.loadMore(section);
      setAttempt();
    } catch {
      setLoadMoreError(true);
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

  if (state.status === "missing") return <Redirect href="/" />;
  if (state.status === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t("workspace.errorDescription")}
          onAction={() => {
            setState({ status: "loading" });
            setAttempt();
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
      loadMoreError={loadMoreError}
      loadingMore={loadingMore}
      mode={mode}
      revision={attempt}
      onErased={() => {
        finish?.();
        router.replace("/");
      }}
      onLoadMore={
        source.hasMore(section) && !loadingMore
          ? () => {
              void loadMore();
            }
          : undefined
      }
      onDataManagement={() => navigate(() => setMode({ kind: "data-management" }))}
      onAddEntry={() => navigate(() => setMode({ kind: "select-type" }))}
      onAddRefuelling={() => navigate(() => setMode({ kind: "refuelling-form" }))}
      onAddDocument={() => navigate(() => setMode({ kind: "document-form" }))}
      onCancelFlow={() => {
        finish?.();
        if (router.canGoBack()) router.back();
        else setMode({ kind: "history" });
      }}
      onChooseType={(type) => navigate(() => setMode({ kind: "form", type }))}
      onConfigureFuel={() => navigate(() => setMode({ kind: "vehicle-form", returnTo: "fuel" }))}
      onDocuments={() => {
        finish?.();
        router.dismissTo("/vehicle/documents");
      }}
      onDocumentsChanged={() => {
        source.invalidate("documents");
        finish?.();
        router.dismissTo("/vehicle/documents");
        setAttempt();
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
      onFuel={() => {
        finish?.();
        router.dismissTo("/vehicle/(tabs)/fuel");
      }}
      onReminders={() => navigate(() => setMode({ kind: "reminders" }))}
      onFuelChanged={() => {
        source.invalidate("fuel");
        finish?.();
        router.dismissTo("/vehicle/(tabs)/fuel");
        setAttempt();
      }}
      onSaved={(entry) => {
        void source
          .changedHistory(entry, mode.kind === "detail" ? mode.entry.id : undefined)
          .then(() => {
            finish?.();
            router.dismissTo("/vehicle/(tabs)/overview");
            setAttempt();
          });
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
  if (
    props.mode.kind.includes("form") ||
    props.mode.kind === "select-type" ||
    props.mode.kind === "data-management"
  )
    return renderContent(props, false);
  const isDetail = ["detail", "document-detail", "refuelling-detail"].includes(props.mode.kind);
  return (
    <AdaptiveWorkspace
      phone={renderContent(props, false)}
      primaryPane={renderContent(props, true, isDetail)}
      detailPane={isDetail ? renderContent(props, true) : undefined}
    />
  );
}

function renderContent(props: VehicleWorkspaceViewProps, embedded: boolean, showList = false) {
  const { mode, vehicle, services } = props;
  const configuredVehicle = hasFuelConfiguration(vehicle) ? vehicle : undefined;
  const kind = showList ? workspaceSection(mode) : mode.kind;
  switch (kind) {
    case "data-management":
      return (
        <DataManagement
          eraseData={services.eraseData}
          onBack={props.onCancelFlow}
          onErased={props.onErased}
        />
      );
    case "reminders":
      return (
        <RemindersSection
          key={props.revision}
          onEditReminder={(kind) =>
            router.push({ pathname: "/vehicle/reminder-editor", params: { kind } })
          }
          {...services}
          embedded={embedded}
          vehicle={vehicle}
          onBack={props.onCancelFlow}
        />
      );
    case "fuel":
      return (
        <RefuellingList
          onLoadMore={props.onLoadMore}
          loadingMore={props.loadingMore}
          loadMoreError={props.loadMoreError}
          embedded={embedded}
          history={props.refuellingHistory}
          onAdd={props.onAddRefuelling}
          onBack={props.onCancelFlow}
          onConfigureFuel={props.onConfigureFuel}
          onSelect={props.onSelectRefuelling}
          selectedId={mode.kind === "refuelling-detail" ? mode.refuelling.id : undefined}
          vehicle={vehicle}
        />
      );
    case "documents":
      return (
        <DocumentList
          embedded={embedded}
          documents={props.documents}
          entries={props.relatedEntries ?? []}
          onAdd={props.onAddDocument}
          onBack={props.onCancelFlow}
          onSelect={props.onSelectDocument}
          selectedId={mode.kind === "document-detail" ? mode.document.id : undefined}
        />
      );
    case "document-form":
      if (mode.kind !== "document-form") break;
      return (
        <DocumentForm
          embedded={embedded}
          document={mode.document}
          documents={services.documents}
          historyEntries={services.historyEntries}
          entries={props.relatedEntries ?? []}
          onCancel={props.onDocuments}
          onSaved={props.onDocumentsChanged}
          picker={services.documentPicker}
          vehicle={vehicle}
        />
      );
    case "document-detail":
      if (mode.kind !== "document-detail") break;
      return (
        <DocumentDetail
          key={mode.document.id}
          embedded={embedded}
          document={mode.document}
          documents={services.documents}
          entries={props.relatedEntries ?? []}
          onBack={props.onDocuments}
          onChanged={props.onDocumentsChanged}
          onEdit={() => props.onEditDocument(mode.document)}
          picker={services.documentPicker}
          vehicle={vehicle}
        />
      );
    case "refuelling-form":
      if (mode.kind !== "refuelling-form" || !configuredVehicle) break;
      return (
        <RefuellingForm
          embedded={embedded}
          clock={services.clock}
          onCancel={props.onFuel}
          onSaved={props.onFuelChanged}
          refuelling={mode.refuelling}
          refuellings={services.refuellings}
          vehicle={configuredVehicle}
        />
      );
    case "refuelling-detail":
      if (mode.kind !== "refuelling-detail" || !configuredVehicle) break;
      return (
        <RefuellingDetail
          key={mode.refuelling.id}
          embedded={embedded}
          onBack={props.onFuel}
          onDeleted={props.onFuelChanged}
          onEdit={() => props.onEditRefuelling(mode.refuelling)}
          refuelling={mode.refuelling}
          refuellings={services.refuellings}
          vehicle={configuredVehicle}
        />
      );
    case "vehicle-form":
      if (mode.kind !== "vehicle-form") break;
      return (
        <VehicleEditForm
          {...services}
          embedded={embedded}
          existingPhotoUri={props.photoUri}
          onCancel={mode.returnTo === "fuel" ? props.onFuel : props.onCancelFlow}
          onSaved={mode.returnTo === "fuel" ? props.onFuelChanged : props.onSaved}
          vehicle={vehicle}
        />
      );
    case "select-type":
      return (
        <EntryTypeSelection
          embedded={embedded}
          onCancel={props.onCancelFlow}
          onSelect={props.onChooseType}
        />
      );
    case "form":
      if (mode.kind !== "form") break;
      return (
        <EntryForm
          {...services}
          embedded={embedded}
          entry={mode.entry}
          onCancel={props.onCancelFlow}
          onSaved={props.onSaved}
          type={mode.type}
          vehicle={vehicle}
        />
      );
    case "detail":
      if (mode.kind !== "detail") break;
      return (
        <EntryDetail
          key={mode.entry.id}
          embedded={embedded}
          entry={mode.entry}
          historyEntries={services.historyEntries}
          onBack={props.onCancelFlow}
          onDeleted={props.onSaved}
          onEdit={() => props.onEditEntry(mode.entry)}
          vehicle={vehicle}
        />
      );
  }
  return (
    <PhoneWorkspace
      {...props}
      selectedId={props.mode.kind === "detail" ? props.mode.entry.id : undefined}
    />
  );
}
