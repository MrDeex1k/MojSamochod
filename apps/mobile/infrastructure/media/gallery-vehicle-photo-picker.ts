import { File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import type {
  VehiclePhotoPicker,
  VehiclePhotoSelectionResult,
} from "@/application/storage/vehicle-photo-picker";
export type {
  VehiclePhotoPicker,
  VehiclePhotoSelectionResult,
} from "@/application/storage/vehicle-photo-picker";

const markerName = "vehicle-photo-picker-owner";
const markerLifetimeMs = 24 * 60 * 60 * 1000;

export class GalleryVehiclePhotoPicker implements VehiclePhotoPicker {
  private selecting = false;
  private recovery?: Promise<void>;
  private recovered?: { owner: string; result: VehiclePhotoSelectionResult };

  private get marker() {
    return new File(Paths.cache, markerName);
  }

  async select(owner: string): Promise<VehiclePhotoSelectionResult> {
    if (this.selecting) return { kind: "cancelled" };
    this.selecting = true;
    try {
      if (Platform.OS === "ios") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return { kind: "denied" };
      }
      if (Platform.OS === "android") {
        await this.recovery;
        // Drain an older result before assigning the system picker to this form.
        await ImagePicker.getPendingResultAsync();
        this.recovered = undefined;
        this.marker.write(owner);
      }
      return await processResult(
        await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          mediaTypes: ["images"],
          quality: 1,
          selectionLimit: 1,
        }),
      );
    } catch (cause) {
      return { cause, kind: "unavailable" };
    } finally {
      this.selecting = false;
      this.clearOwner();
    }
  }

  /** Keeps picker inputs across bootstrap when Android has not dispatched its result yet. */
  async recoverBeforeCleanup(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    await this.recoverPending();
    try {
      return !!this.recovered || this.marker.exists;
    } catch {
      return !!this.recovered;
    }
  }

  async isRestoring(owner: string): Promise<boolean> {
    if (Platform.OS !== "android" || this.selecting) return false;
    await this.recoverPending();
    if (this.recovered) return this.recovered.owner === owner;
    try {
      const marker = this.marker;
      return marker.exists && marker.textSync() === owner;
    } catch {
      return false;
    }
  }

  async takeRecovered(
    owner: string,
    signal?: AbortSignal,
  ): Promise<VehiclePhotoSelectionResult | undefined> {
    await this.recoverPending();
    if (signal?.aborted || this.recovered?.owner !== owner) return undefined;
    const { result } = this.recovered;
    this.recovered = undefined;
    return result;
  }

  async abandonRecovery(owner: string): Promise<void> {
    if (Platform.OS !== "android" || this.selecting) return;
    await this.recovery;
    if (this.recovered?.owner === owner) this.recovered = undefined;
    const marker = this.marker;
    if (marker.exists && marker.textSync() === owner) this.clearOwner();
  }

  forgetRecovered(): void {
    this.recovered = undefined;
  }

  private recoverPending(): Promise<void> {
    if (Platform.OS !== "android" || this.selecting || this.recovered) return Promise.resolve();
    this.recovery ??= this.readPending().finally(() => {
      this.recovery = undefined;
    });
    return this.recovery;
  }

  private async readPending(): Promise<void> {
    let owner: string | undefined;
    try {
      const marker = this.marker;
      if (!marker.exists) return;
      if (
        marker.modificationTime !== null &&
        Date.now() - marker.modificationTime > markerLifetimeMs
      ) {
        this.clearOwner();
        return;
      }
      owner = marker.textSync();
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending === null) return;
      this.clearOwner();
      this.recovered = {
        owner,
        result:
          "canceled" in pending
            ? await processResult(pending)
            : { kind: "unavailable", cause: pending },
      };
    } catch (cause) {
      this.clearOwner();
      if (owner) this.recovered = { owner, result: { kind: "unavailable", cause } };
    }
  }

  private clearOwner(): void {
    if (Platform.OS !== "android") return;
    try {
      const marker = this.marker;
      if (marker.exists) marker.delete();
    } catch {
      // Android can purge the cache while the picker is open.
    }
  }
}

async function processResult(
  result: ImagePicker.ImagePickerResult,
): Promise<VehiclePhotoSelectionResult> {
  if (result.canceled || !result.assets[0]) return { kind: "cancelled" };
  const asset = result.assets[0];
  const sourceSide = Math.min(asset.width, asset.height);
  if (sourceSide <= 0) throw new Error("Invalid photo dimensions");
  const side = Math.min(sourceSide, 2048);
  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      ...(asset.width === asset.height
        ? []
        : [
            {
              crop: {
                originX: Math.floor((asset.width - sourceSide) / 2),
                originY: Math.floor((asset.height - sourceSide) / 2),
                width: sourceSide,
                height: sourceSide,
              },
            },
          ]),
      { resize: { height: side, width: side } },
    ],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    kind: "selected",
    mimeType: "image/jpeg",
    originalName: asset.fileName ?? "vehicle-photo.jpg",
    uri: processed.uri,
  };
}
