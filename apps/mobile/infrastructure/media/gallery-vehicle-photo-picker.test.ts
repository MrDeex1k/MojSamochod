let mockOwner: string | undefined;
const mockPendingResult = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class {
    get exists() {
      return mockOwner !== undefined;
    }
    modificationTime = null;
    write(value: string) {
      mockOwner = value;
    }
    textSync() {
      return mockOwner;
    }
    delete() {
      mockOwner = undefined;
    }
  },
}));

const mockRequestPermission = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockManipulate = jest.fn();

jest.mock("expo-image-picker", () => ({
  getPendingResultAsync: () => mockPendingResult(),
  launchImageLibraryAsync: (...arguments_: unknown[]) => mockLaunchImageLibrary(...arguments_),
  requestMediaLibraryPermissionsAsync: (...arguments_: unknown[]) =>
    mockRequestPermission(...arguments_),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: (...arguments_: unknown[]) => mockManipulate(...arguments_),
}));

import { GalleryVehiclePhotoPicker } from "./gallery-vehicle-photo-picker";
import { Platform } from "react-native";

describe("GalleryVehiclePhotoPicker", () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwner = undefined;
    mockPendingResult.mockResolvedValue(null);
    mockRequestPermission.mockResolvedValue({ granted: true });
    mockManipulate.mockResolvedValue({ uri: "file:///processed.jpg" });
  });

  it("returns denied without opening the gallery when permission is missing", async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });

    await expect(new GalleryVehiclePhotoPicker().select("setup")).resolves.toEqual({
      kind: "denied",
    });
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
  });

  it("uses Android's selected-file grant without requesting library access", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    mockLaunchImageLibrary.mockResolvedValue({ assets: [], canceled: true });
    await expect(new GalleryVehiclePhotoPicker().select("setup")).resolves.toEqual({
      kind: "cancelled",
    });
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockLaunchImageLibrary).toHaveBeenCalledTimes(1);
  });

  it("opens only the image gallery and creates a square JPEG within the size limit", async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [
        {
          fileName: "my-car.heic",
          height: 3000,
          uri: "file:///selected.heic",
          width: 4000,
        },
      ],
      canceled: false,
    });

    await expect(new GalleryVehiclePhotoPicker().select("setup")).resolves.toEqual({
      kind: "selected",
      mimeType: "image/jpeg",
      originalName: "my-car.heic",
      uri: "file:///processed.jpg",
    });
    expect(mockLaunchImageLibrary).toHaveBeenCalledWith({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 1,
      selectionLimit: 1,
    });
    expect(mockManipulate).toHaveBeenCalledWith(
      "file:///selected.heic",
      [
        { crop: { originX: 500, originY: 0, width: 3000, height: 3000 } },
        { resize: { height: 2048, width: 2048 } },
      ],
      { compress: 0.85, format: "jpeg" },
    );
  });

  it("returns cancelled without processing an image", async () => {
    mockLaunchImageLibrary.mockResolvedValue({ assets: [], canceled: true });

    await expect(new GalleryVehiclePhotoPicker().select("setup")).resolves.toEqual({
      kind: "cancelled",
    });
    expect(mockManipulate).not.toHaveBeenCalled();
  });
});

it("recovers an Android selection only for its originating form and protects deferred picker files", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  mockOwner = "edit:vehicle";
  mockPendingResult
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///picked.jpg", height: 600, width: 600 }],
    });
  const picker = new GalleryVehiclePhotoPicker();
  await expect(picker.recoverBeforeCleanup()).resolves.toBe(true);
  await expect(picker.isRestoring("edit:vehicle")).resolves.toBe(true);
  await expect(picker.takeRecovered("setup")).resolves.toBeUndefined();
  await expect(picker.takeRecovered("edit:vehicle")).resolves.toMatchObject({
    kind: "selected",
    uri: "file:///processed.jpg",
  });
  await expect(picker.takeRecovered("edit:vehicle")).resolves.toBeUndefined();
  expect(mockOwner).toBeUndefined();
});
