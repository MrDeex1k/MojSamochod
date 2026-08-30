const mockRequestPermission = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockManipulate = jest.fn();

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...arguments_: unknown[]) => mockLaunchImageLibrary(...arguments_),
  requestMediaLibraryPermissionsAsync: (...arguments_: unknown[]) =>
    mockRequestPermission(...arguments_),
}));

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  manipulateAsync: (...arguments_: unknown[]) => mockManipulate(...arguments_),
}));

import { GalleryVehiclePhotoPicker } from "./gallery-vehicle-photo-picker";

describe("GalleryVehiclePhotoPicker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPermission.mockResolvedValue({ granted: true });
    mockManipulate.mockResolvedValue({ uri: "file:///processed.jpg" });
  });

  it("returns denied without opening the gallery when permission is missing", async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });

    await expect(new GalleryVehiclePhotoPicker().select()).resolves.toEqual({ kind: "denied" });
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
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

    await expect(new GalleryVehiclePhotoPicker().select()).resolves.toEqual({
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
      [{ resize: { height: 2048, width: 2048 } }],
      { compress: 0.85, format: "jpeg" },
    );
  });

  it("returns cancelled without processing an image", async () => {
    mockLaunchImageLibrary.mockResolvedValue({ assets: [], canceled: true });

    await expect(new GalleryVehiclePhotoPicker().select()).resolves.toEqual({ kind: "cancelled" });
    expect(mockManipulate).not.toHaveBeenCalled();
  });
});
