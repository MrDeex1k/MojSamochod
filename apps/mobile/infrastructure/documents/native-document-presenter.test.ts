const mockCreateDirectory = jest.fn();
const mockCopy = jest.fn().mockResolvedValue(undefined);
const mockIsAvailable = jest.fn();
const mockShare = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-file-system", () => ({
  Directory: jest.fn().mockImplementation(() => ({ create: mockCreateDirectory })),
  File: jest.fn().mockImplementation((parent: string | { uri?: string }, name?: string) => ({
    copy: mockCopy,
    uri: name ? `file:///cache/document-exports/${name}` : String(parent),
  })),
  Paths: { cache: "file:///cache" },
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...arguments_: unknown[]) => mockShare(...arguments_),
}));

import { NativeDocumentPresenter } from "./native-document-presenter";

describe("NativeDocumentPresenter", () => {
  it("shares a readable cache copy under the original file name", async () => {
    mockIsAvailable.mockResolvedValue(true);

    await expect(
      new NativeDocumentPresenter().share({
        mimeType: "application/pdf",
        name: "invoice.pdf",
        uri: "file:///managed/018f47e2.pdf",
      }),
    ).resolves.toBe(true);

    expect(mockCreateDirectory).toHaveBeenCalledWith({ idempotent: true, intermediates: true });
    expect(mockCopy).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///cache/document-exports/invoice.pdf" }),
      { overwrite: true },
    );
    expect(mockShare).toHaveBeenCalledWith("file:///cache/document-exports/invoice.pdf", {
      dialogTitle: "invoice.pdf",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  });

  it("does not prepare an export when native sharing is unavailable", async () => {
    mockIsAvailable.mockResolvedValue(false);

    await expect(
      new NativeDocumentPresenter().share({
        mimeType: "image/jpeg",
        name: "photo.jpg",
        uri: "file:///managed/photo.jpg",
      }),
    ).resolves.toBe(false);

    expect(mockCopy).not.toHaveBeenCalled();
    expect(mockShare).not.toHaveBeenCalled();
  });
});
