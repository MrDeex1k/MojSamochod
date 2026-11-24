export type VehiclePhotoSelectionResult =
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{ kind: "denied" }>
  | Readonly<{
      kind: "selected";
      mimeType: "image/jpeg";
      originalName: string;
      uri: string;
    }>
  | Readonly<{ cause: unknown; kind: "unavailable" }>;

export interface VehiclePhotoPicker {
  isRestoring?(owner: string): Promise<boolean>;
  takeRecovered?(
    owner: string,
    signal?: AbortSignal,
  ): Promise<VehiclePhotoSelectionResult | undefined>;
  abandonRecovery?(owner: string): Promise<void>;
  select(owner: string): Promise<VehiclePhotoSelectionResult>;
}

export const setupPhotoOwner = "setup";

export function editPhotoOwner(vehicleId: string): string {
  return `edit:${vehicleId}`;
}
