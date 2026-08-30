const mockGetDocumentAsync = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...arguments_: unknown[]) => mockGetDocumentAsync(...arguments_),
}));

import { maximumDocumentBytes } from "@/application/storage/object-storage";

import { SystemDocumentPicker } from "./system-document-picker";

describe("SystemDocumentPicker", () => {
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
