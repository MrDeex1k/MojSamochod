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
  select(): Promise<VehiclePhotoSelectionResult>;
}
