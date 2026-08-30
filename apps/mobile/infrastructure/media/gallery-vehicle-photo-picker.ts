import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

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

export class GalleryVehiclePhotoPicker implements VehiclePhotoPicker {
  async select(): Promise<VehiclePhotoSelectionResult> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return { kind: "denied" };

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 1,
        selectionLimit: 1,
      });
      if (result.canceled || !result.assets[0]) return { kind: "cancelled" };

      const asset = result.assets[0];
      const side = Math.min(asset.width, asset.height, 2048);
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { height: side, width: side } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      return {
        kind: "selected",
        mimeType: "image/jpeg",
        originalName: asset.fileName ?? "vehicle-photo.jpg",
        uri: processed.uri,
      };
    } catch (cause) {
      return { cause, kind: "unavailable" };
    }
  }
}
