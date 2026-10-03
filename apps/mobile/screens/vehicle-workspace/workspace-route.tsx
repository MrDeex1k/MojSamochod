import { useEffect, useState } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { useApplicationServices } from "@/components/providers/application-provider";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { Screen } from "@/components/layout/screen";
import { useAppTranslation } from "@/localization/use-app-translation";
import {
  documentIdFromUuidV7,
  historyEntryIdFromUuidV7,
  refuellingIdFromUuidV7,
} from "@/domain/shared/identifiers";
import type { ApplicationServices } from "@/components/providers/application-provider";
import type { WorkspaceMode } from "./workspace-types";
import { VehicleWorkspaceScreen } from "./index";

type Params = { kind?: string; id?: string; type?: string; returnTo?: string };
export function WorkspaceRoute({ kind }: { kind?: WorkspaceMode["kind"] }) {
  const { id, type, returnTo, kind: paramKind } = useLocalSearchParams<Params>();
  const services = useApplicationServices();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ mode: WorkspaceMode } | { error: true } | null>(null);
  const routeKind = kind ?? paramKind;
  useEffect(() => {
    let active = true;
    void resolveMode(services, { id, type, returnTo, kind: routeKind }).then(
      (mode) => {
        if (active) setState({ mode });
      },
      () => {
        if (active) setState({ error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [services, routeKind, id, type, returnTo, attempt]);
  if (!state)
    return (
      <Screen>
        <LoadingState label={t("workspace.loading")} />
      </Screen>
    );
  if ("error" in state)
    return (
      <Screen>
        <ErrorState
          title={t("workspace.errorTitle")}
          description={t("workspace.errorDescription")}
          actionLabel={t("database.errorAction")}
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  return (
    <>
      <Stack.Screen options={{ title: routeTitle(state.mode, t) }} />
      <VehicleWorkspaceScreen mode={state.mode} />
    </>
  );
}

async function resolveMode(services: ApplicationServices, params: Params): Promise<WorkspaceMode> {
  const kind = params.kind;
  if (
    kind === "history" ||
    kind === "fuel" ||
    kind === "documents" ||
    kind === "reminders" ||
    kind === "data-management" ||
    kind === "select-type"
  )
    return { kind };
  if (kind === "vehicle-form")
    return { kind, returnTo: params.returnTo === "fuel" ? "fuel" : "history" };
  const vehicle = await services.vehicles.get();
  if (!vehicle.ok || !vehicle.value) throw new Error("Vehicle unavailable");
  const vehicleId = vehicle.value.id;
  if (kind === "document-form" || kind === "document-detail") {
    const result = params.id
      ? await services.documents.get(vehicleId, documentIdFromUuidV7(params.id))
      : null;
    if (result && (!result.ok || !result.value)) throw new Error("Document unavailable");
    const document = result?.ok ? (result.value ?? undefined) : undefined;
    if (kind === "document-detail") {
      if (!document) throw new Error("Document required");
      return { kind, document };
    }
    return { kind, document };
  }
  if (kind === "refuelling-form" || kind === "refuelling-detail") {
    const result = params.id
      ? await services.refuellings.get(vehicleId, refuellingIdFromUuidV7(params.id))
      : null;
    if (result && (!result.ok || !result.value)) throw new Error("Refuelling unavailable");
    const refuelling = result?.ok ? (result.value ?? undefined) : undefined;
    if (kind === "refuelling-detail") {
      if (!refuelling) throw new Error("Refuelling required");
      return { kind, refuelling };
    }
    return { kind, refuelling };
  }
  if (kind === "form" || kind === "detail") {
    const result = params.id
      ? await services.historyEntries.get(vehicleId, historyEntryIdFromUuidV7(params.id))
      : null;
    if (result && (!result.ok || !result.value)) throw new Error("Entry unavailable");
    const entry = result?.ok ? (result.value ?? undefined) : undefined;
    if (kind === "detail") {
      if (!entry) throw new Error("Entry required");
      return { kind, entry };
    }
    const type = entry?.type ?? params.type;
    if (type !== "repair" && type !== "inspection" && type !== "replacement")
      throw new Error("Invalid entry type");
    return { kind, entry, type };
  }
  throw new Error("Unknown route");
}

function routeTitle(mode: WorkspaceMode, t: (key: string) => string) {
  if (mode.kind === "select-type") return t("entrySelection.title");
  if (mode.kind === "history") return t("navigation.vehicle");
  if (mode.kind === "fuel" || mode.kind === "reminders" || mode.kind === "documents")
    return t(`navigation.${mode.kind}`);
  if (mode.kind === "vehicle-form") return t("workspace.editVehicle");
  if (mode.kind.startsWith("document")) return t("navigation.documents");
  if (mode.kind.startsWith("refuelling")) return t("navigation.fuel");
  if (mode.kind === "data-management") return t("dataManagement.title");
  return t("workspace.historyTitle");
}
