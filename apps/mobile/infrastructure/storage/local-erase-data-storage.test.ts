const mockPaths = new Set<string>();
let mockFailDeletion = false;
let mockFailList = false;
jest.mock("expo-file-system", () => {
  class MockFile {
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
  }
  class MockDirectory {
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
      if (mockFailList || !this.exists) throw new Error("Could not list directory");
      const names = new Set(
        [...mockPaths]
          .filter((path) => path.startsWith(this.path + "/"))
          .map((path) => path.slice(this.path.length + 1).split("/")[0]),
      );
      return [...names].map((name) => {
        const path = `${this.path}/${name}`;
        return [...mockPaths].some((entry) => entry.startsWith(path + "/"))
          ? new MockDirectory(path)
          : new MockFile(path);
      });
    }
    create() {
      mockPaths.add(this.path);
    }
    delete() {
      if (mockFailDeletion && this.path === "/cache/DocumentPicker") throw new Error("I/O error");
      for (const path of mockPaths)
        if (path === this.path || path.startsWith(this.path + "/")) mockPaths.delete(path);
    }
  }
  return {
    Paths: { document: "/documents", cache: "/cache" },
    File: MockFile,
    Directory: MockDirectory,
  };
});
jest.mock("@/infrastructure/database/clear-user-data", () => ({ clearUserData: jest.fn() }));
import { LocalEraseDataStorage } from "./local-erase-data-storage";
import { EraseAllData } from "@/application/storage/erase-all-data";
import type { AppDatabase } from "@/infrastructure/database/database";

const make = () =>
  new EraseAllData(new LocalEraseDataStorage({} as AppDatabase), async () => ({ ok: true }));

beforeEach(() => {
  mockPaths.clear();
  mockFailDeletion = false;
  mockFailList = false;
});

it("removes picker and image-processing copies and retains the marker until every directory is cleared", async () => {
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
  mockFailDeletion = true;
  expect((await make().erase()).ok).toBe(false);
  expect(mockPaths.has("/documents/erase-data-pending")).toBe(true);
  mockFailDeletion = false;
  expect((await make().resume()).ok).toBe(true);
  expect([...mockPaths]).toEqual(["/originals/doc.pdf"]);
});

it("completes erasure when the OS has removed the cache directory", async () => {
  mockPaths.add("/documents/managed-objects/objects/doc.pdf");
  expect((await make().erase()).ok).toBe(true);
  expect(mockPaths.has("/documents/managed-objects/objects/doc.pdf")).toBe(false);
  expect(mockPaths.has("/documents/erase-data-pending")).toBe(false);
});

it("retains the pending marker when cache listing fails and resumes when accessible", async () => {
  const pickerCopy = "/cache/native-picker-copy.jpg";
  mockPaths.add(pickerCopy);
  mockFailList = true;
  expect((await make().erase()).ok).toBe(false);
  expect(mockPaths.has("/documents/erase-data-pending")).toBe(true);
  expect(mockPaths.has(pickerCopy)).toBe(true);
  mockFailList = false;
  expect((await make().resume()).ok).toBe(true);
  expect(mockPaths.size).toBe(0);
});
