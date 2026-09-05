import type { ApplicationServices } from "@/components/providers/application-provider";
import type { RefuellingHistory } from "@/application/refuelling/refuelling-service";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { Refuelling } from "@/domain/refuelling/refuelling";
import type { Vehicle } from "@/domain/vehicle/vehicle";

export type WorkspaceData = Readonly<{
  documents: readonly VehicleDocument[];
  entries: readonly HistoryEntry[];
  photoUri: string | null;
  refuellingHistory: RefuellingHistory;
  vehicle: Vehicle;
}>;

export type WorkspaceMode =
  | Readonly<{ kind: "data-management" }>
  | Readonly<{ document: VehicleDocument; kind: "document-detail" }>
  | Readonly<{ document?: VehicleDocument; kind: "document-form" }>
  | Readonly<{ kind: "documents" }>
  | Readonly<{ entry: HistoryEntry; kind: "detail" }>
  | Readonly<{ entry?: HistoryEntry; kind: "form"; type: HistoryEntry["type"] }>
  | Readonly<{ kind: "history" }>
  | Readonly<{ kind: "fuel" }>
  | Readonly<{ kind: "reminders" }>
  | Readonly<{ kind: "refuelling-form"; refuelling?: Refuelling }>
  | Readonly<{ kind: "refuelling-detail"; refuelling: Refuelling }>
  | Readonly<{ kind: "select-type" }>
  | Readonly<{ kind: "vehicle-form"; returnTo: "fuel" | "history" }>;

export type VehicleWorkspaceViewProps = WorkspaceData &
  Readonly<{
    mode: WorkspaceMode;
    onLoadMore?: () => void;
    onDataManagement: () => void;
    onErased: () => void;
    onAddEntry: () => void;
    onAddDocument: () => void;
    onCancelFlow: () => void;
    onChooseType: (type: HistoryEntry["type"]) => void;
    onConfigureFuel: () => void;
    onDocuments: () => void;
    onDocumentsChanged: () => void;
    onEditDocument: (document: VehicleDocument) => void;
    onEditEntry: (entry: HistoryEntry) => void;
    onEditRefuelling: (refuelling: Refuelling) => void;
    onEditVehicle: () => void;
    onFuel: () => void;
    onReminders: () => void;
    onFuelChanged: () => void;
    onAddRefuelling: () => void;
    onSaved: () => void;
    onSelectEntry: (entry: HistoryEntry) => void;
    onSelectRefuelling: (refuelling: Refuelling) => void;
    onSelectDocument: (document: VehicleDocument) => void;
    services: ApplicationServices;
  }>;
