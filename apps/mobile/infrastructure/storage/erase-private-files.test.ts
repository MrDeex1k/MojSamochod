const mockDelete = jest.fn();
const mockClearMemory = jest.fn().mockResolvedValue(true);
const mockClearDisk = jest.fn().mockResolvedValue(true);
jest.mock("expo-image", () => ({
  Image: { clearMemoryCache: () => mockClearMemory(), clearDiskCache: () => mockClearDisk() },
}));
const mockDirectory = jest.fn((parent: string, name: string) => ({
  exists: true,
  delete: () => mockDelete(`${parent}/${name}`),
}));
jest.mock("expo-file-system", () => ({
  Directory: function (parent: string, name: string) {
    return mockDirectory(parent, name);
  },
  Paths: { document: "private", cache: "cache" },
}));
import { erasePrivateFiles } from "./erase-private-files";

it("deletes only app-owned directories, never roots or externally saved PDFs", async () => {
  await erasePrivateFiles();
  expect(mockDelete.mock.calls.map(([path]) => path)).toEqual([
    "private/managed-objects",
    "cache/document-exports",
    "cache/DocumentPicker",
    "cache/ImagePicker",
    "cache/ImageManipulator",
  ]);
  expect(mockClearMemory).toHaveBeenCalledTimes(1);
  expect(mockClearDisk).toHaveBeenCalledTimes(1);
});

it("keeps reset incomplete when the image cache cannot be cleared", async () => {
  mockClearDisk.mockResolvedValueOnce(false);
  await expect(erasePrivateFiles()).rejects.toThrow("Image cache cleanup");
});

it("does not hide a cleanup failure", async () => {
  mockDelete.mockImplementationOnce(() => {
    throw new Error("EACCES");
  });
  await expect(erasePrivateFiles()).rejects.toThrow("EACCES");
});
