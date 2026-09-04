const mockCopy = jest.fn().mockResolvedValue(undefined);
const mockWrite = jest.fn().mockResolvedValue(undefined);
const mockBase64 = jest.fn().mockResolvedValue("JVBERi0x");
const mockDelete = jest.fn();
const mockCreateFile = jest.fn(() => ({ uri: "content://selected/new.pdf", delete: mockDelete }));
const mockList = jest.fn((): { name: string }[] => []);
const mockPick = jest.fn();

jest.mock("expo-file-system", () => ({
  Directory: { pickDirectoryAsync: () => mockPick() },
  File: jest.fn().mockImplementation((uri: string) => ({
    copy: mockCopy,
    base64: mockBase64,
    uri,
  })),
}));
jest.mock("expo-file-system/legacy", () => ({
  EncodingType: { Base64: "base64" },
  writeAsStringAsync: (...args: unknown[]) => mockWrite(...args),
}));

import { NativeDocumentPresenter } from "./native-document-presenter";

describe("NativeDocumentPresenter", () => {
  const input = {
    mimeType: "application/pdf",
    name: "invoice.pdf",
    uri: "file:///managed/018f47e2.pdf",
  };
  beforeEach(() => {
    mockPick.mockResolvedValue({ createFile: mockCreateFile, list: mockList });
    mockList.mockReturnValue([]);
  });
  it("saves a copy to the user-selected folder without opening or sharing it", async () => {
    await expect(new NativeDocumentPresenter().downloadPdf(input)).resolves.toBe("saved");
    expect(mockCreateFile).toHaveBeenCalledWith("invoice.pdf", "application/pdf");
    expect(mockWrite).toHaveBeenCalledWith("content://selected/new.pdf", "JVBERi0x", {
      encoding: "base64",
    });
    expect(mockCopy).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
  it.each(["ERR_PICKER_CANCELLED", "ERR_FILE_PICKING_CANCELLED"])(
    "handles cancellation %s",
    async (code) => {
      mockPick.mockRejectedValueOnce({ code });
      await expect(new NativeDocumentPresenter().downloadPdf(input)).resolves.toBe("cancelled");
      expect(mockCreateFile).not.toHaveBeenCalled();
      expect(mockCopy).not.toHaveBeenCalled();
    },
  );
  it("does not overwrite an existing file", async () => {
    mockList.mockReturnValue([{ name: "invoice.pdf" }, { name: "invoice (1).pdf" }]);
    await new NativeDocumentPresenter().downloadPdf(input);
    expect(mockCreateFile).toHaveBeenCalledWith("invoice (2).pdf", "application/pdf");
  });
  it("sanitizes a filename instead of interpreting it as a path", async () => {
    await new NativeDocumentPresenter().downloadPdf({ ...input, name: "folder/invoice.pdf" });
    expect(mockCreateFile).toHaveBeenCalledWith("folder-invoice.pdf", "application/pdf");
  });
  it("rejects non-PDF downloads before asking for a folder", async () => {
    await expect(
      new NativeDocumentPresenter().downloadPdf({ ...input, mimeType: "image/jpeg" }),
    ).rejects.toThrow("Only PDF");
    expect(mockPick).not.toHaveBeenCalled();
  });
  it("removes only the new partial copy after a write failure", async () => {
    mockWrite.mockRejectedValueOnce(new Error("ENOSPC"));
    await expect(new NativeDocumentPresenter().downloadPdf(input)).rejects.toThrow("ENOSPC");
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
  it("uses native file copying for Apple file URIs", async () => {
    mockCreateFile.mockReturnValueOnce({ uri: "file:///selected/new.pdf", delete: mockDelete });
    await new NativeDocumentPresenter().downloadPdf(input);
    expect(mockCopy).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file:///selected/new.pdf" }),
      { overwrite: true },
    );
    expect(mockWrite).not.toHaveBeenCalled();
  });
  it("does not hide permission or provider failures as cancellation", async () => {
    mockPick.mockRejectedValueOnce(new Error("denied"));
    await expect(new NativeDocumentPresenter().downloadPdf(input)).rejects.toThrow("denied");
    expect(mockCreateFile).not.toHaveBeenCalled();
  });
});
