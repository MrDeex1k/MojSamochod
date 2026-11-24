const mockPick = jest.fn();
jest.mock("@/modules/document-preview/src/DocumentImportModule", () => ({
  documentImport: () => ({ pick: mockPick }),
}));

const mockGetDocumentAsync = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...arguments_: unknown[]) => mockGetDocumentAsync(...arguments_),
}));

import { maximumDocumentBytes } from "@/application/storage/object-storage";

import { SystemDocumentPicker } from "./system-document-picker";
import { Platform } from "react-native";

describe("SystemDocumentPicker", () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "android");
  });

  it("opens iOS documents in place through the bounded native importer", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    const selection = {
      kind: "selected",
      document: {
        uri: "document-bookmark:fixture",
        mimeType: "application/pdf",
        name: "invoice.pdf",
      },
    };
    mockPick.mockResolvedValue(selection);
    await expect(new SystemDocumentPicker().pick()).resolves.toEqual(selection);
    expect(mockPick).toHaveBeenCalledWith(maximumDocumentBytes);
    expect(mockGetDocumentAsync).not.toHaveBeenCalled();
  });

  it.each([
    [0, "invalid-size"],
    [maximumDocumentBytes, "selected"],
    [maximumDocumentBytes + 1, "invalid-size"],
    [undefined, "selected"],
  ] as const)("classifies Android provider size %s as %s", async (size, kind) => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { mimeType: "application/pdf", name: "doc.pdf", size, uri: "content://provider/doc" },
      ],
    });
    await expect(new SystemDocumentPicker().pick()).resolves.toMatchObject({ kind });
  });

  it("preserves Android URI permission without copying through the picker cache", async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true });
    await new SystemDocumentPicker().pick();
    expect(mockGetDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ copyToCacheDirectory: false }),
    );
  });
  it("returns a supported PDF selected from the system picker", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      assets: [
        { mimeType: "application/pdf", name: "invoice.pdf", size: 123, uri: "file:///invoice.pdf" },
      ],
      canceled: false,
    });

    await expect(new SystemDocumentPicker().pick()).resolves.toEqual({
      document: {
        mimeType: "application/pdf",
        name: "invoice.pdf",
        size: 123,
        uri: "file:///invoice.pdf",
      },
      kind: "selected",
    });
    expect(mockGetDocumentAsync).toHaveBeenCalledWith({
      copyToCacheDirectory: false,
      multiple: false,
      type: ["application/pdf", "image/jpeg", "image/png"],
    });
  });

  it("rejects oversized and unsupported files before managed storage", async () => {
    mockGetDocumentAsync
      .mockResolvedValueOnce({
        assets: [
          {
            mimeType: "application/pdf",
            name: "large.pdf",
            size: maximumDocumentBytes + 1,
            uri: "file:///large.pdf",
          },
        ],
        canceled: false,
      })
      .mockResolvedValueOnce({
        assets: [{ mimeType: "text/plain", name: "notes.txt", size: 10, uri: "file:///notes.txt" }],
        canceled: false,
      });

    await expect(new SystemDocumentPicker().pick()).resolves.toEqual({ kind: "invalid-size" });
    await expect(new SystemDocumentPicker().pick()).resolves.toEqual({ kind: "unsupported" });
  });

  it.each([null, -1])("defers size validation when the provider reports %s", async (size) => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ name: "invoice.pdf", size, uri: "content://provider/doc" }],
    });
    await expect(new SystemDocumentPicker().pick()).resolves.toMatchObject({
      kind: "selected",
      document: { size: undefined },
    });
  });

  it("uses the extension when a platform omits the MIME type", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      assets: [{ name: "receipt.PNG", uri: "file:///receipt.PNG" }],
      canceled: false,
    });

    await expect(new SystemDocumentPicker().pick()).resolves.toMatchObject({
      document: { mimeType: "image/png" },
      kind: "selected",
    });
  });
});
