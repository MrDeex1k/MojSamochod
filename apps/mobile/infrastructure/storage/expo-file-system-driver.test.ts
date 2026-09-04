const mockCreate = jest.fn();
const mockList = jest.fn();
const mockCopy = jest.fn();
let mockDirectoryExists = false;

jest.mock("expo-file-system", () => ({
  Directory: class {
    create = mockCreate;
    list = mockList;
    get exists() {
      return mockDirectoryExists;
    }
  },
  File: class {
    copy = mockCopy;
    exists = false;
  },
  Paths: { document: "file:///documents" },
}));

import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import { ExpoFileSystemDriver, LocalObjectStorage } from "./local-object-storage";

describe("ExpoFileSystemDriver under storage pressure", () => {
  beforeEach(() => {
    mockDirectoryExists = false;
    mockCreate.mockReset();
    mockCopy.mockReset();
    mockList.mockReturnValue([]);
  });

  it("can initialize and list empty storage without writing directories", async () => {
    mockCreate.mockImplementation(() => {
      throw new Error("ENOSPC");
    });

    const storage = new LocalObjectStorage(new ExpoFileSystemDriver());

    await expect(storage.listStagedKeys()).resolves.toEqual({ ok: true, value: [] });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("reports directory creation failure through the import error boundary", async () => {
    const cause = new Error("ENOSPC");
    mockCreate.mockImplementation(() => {
      throw cause;
    });
    const storage = new LocalObjectStorage(new ExpoFileSystemDriver());

    await expect(
      storage.stage({
        extension: "jpg",
        managedFileId: managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f"),
        maximumBytes: 1024,
        sourceUri: "file:///original.jpg",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { cause, kind: "unavailable", operation: "objectStorage.stage" },
    });
    expect(mockCopy).not.toHaveBeenCalled();
  });

  it("creates private directories before copying and lists existing staging", async () => {
    const driver = new ExpoFileSystemDriver();
    await driver.copyFrom("file:///original.jpg", "staging/photo.jpg");
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(mockCreate.mock.invocationCallOrder[2]).toBeLessThan(
      mockCopy.mock.invocationCallOrder[0],
    );
    mockDirectoryExists = true;
    mockList.mockReturnValue([{ name: "photo.jpg" }]);
    expect(driver.list("staging")).toEqual(["photo.jpg"]);
  });
});
