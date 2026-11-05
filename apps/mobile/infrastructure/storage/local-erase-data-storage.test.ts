const mockPaths = new Set<string>();
let mockFailDeletion = false;
jest.mock("expo-file-system", () => ({
  Paths: { document: "/documents", cache: "/cache" },
  File: class {
    path: string;
    constructor(...parts: string[]) {
      this.path = parts.join("/");
    }
    get exists() {
      return mockPaths.has(this.path);
    }
    create() {
      mockPaths.add(this.path);
    }
    delete() {
      mockPaths.delete(this.path);
    }
  },
  Directory: class MockDirectory {
    path: string;
    constructor(...parts: string[]) {
      this.path = parts.join("/");
    }
    get exists() {
      return (
        mockPaths.has(this.path) || [...mockPaths].some((path) => path.startsWith(this.path + "/"))
      );
    }
    list() {
      const names = new Set(
        [...mockPaths]
          .filter((path) => path.startsWith(this.path + "/"))
          .map((path) => path.slice(this.path.length + 1).split("/")[0]),
      );
      return [...names].map((name) => new MockDirectory(this.path, name!));
    }
    delete() {
      if (mockFailDeletion && this.path === "/cache/DocumentPicker") throw new Error("I/O error");
      for (const path of mockPaths)
        if (path === this.path || path.startsWith(this.path + "/")) mockPaths.delete(path);
    }
  },
}));
jest.mock("@/infrastructure/database/clear-user-data", () => ({ clearUserData: jest.fn() }));
import { LocalEraseDataStorage } from "./local-erase-data-storage";
import { EraseAllData } from "@/application/storage/erase-all-data";
import type { AppDatabase } from "@/infrastructure/database/database";

it("removes picker and image-processing copies and retains the marker until every directory is cleared", async () => {
  mockPaths.clear();
  for (const path of [
    "/documents/managed-objects/objects/doc.pdf",
    "/cache/DocumentPicker/doc.pdf",
    "/cache/ImagePicker/photo.jpg",
    "/cache/ImageManipulator/photo.jpg",
    "/cache/document-previews/page.png",
    "/cache/document-exports/old.json",
    "/cache/native-picker-copy.jpg",
    "/originals/doc.pdf",
  ])
    mockPaths.add(path);
  const make = () =>
    new EraseAllData(new LocalEraseDataStorage({} as AppDatabase), async () => ({ ok: true }));
  mockFailDeletion = true;
  expect((await make().erase()).ok).toBe(false);
  expect(mockPaths.has("/documents/erase-data-pending")).toBe(true);
  mockFailDeletion = false;
  expect((await make().resume()).ok).toBe(true);
  expect([...mockPaths]).toEqual(["/originals/doc.pdf"]);
});
