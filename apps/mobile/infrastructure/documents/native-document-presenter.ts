import { Directory, File } from "expo-file-system";
import { EncodingType, writeAsStringAsync } from "expo-file-system/legacy";

export interface DocumentPresenter {
  downloadPdf(
    input: Readonly<{ mimeType: string; name: string; uri: string }>,
  ): Promise<"saved" | "cancelled">;
}

export class NativeDocumentPresenter implements DocumentPresenter {
  async downloadPdf(
    input: Readonly<{ mimeType: string; name: string; uri: string }>,
  ): Promise<"saved" | "cancelled"> {
    if (input.mimeType !== "application/pdf") throw new Error("Only PDF downloads are supported");
    let directory: Directory;
    try {
      directory = await Directory.pickDirectoryAsync();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code === "ERR_FILE_PICKING_CANCELLED" || code === "ERR_PICKER_CANCELLED")
        return "cancelled";
      throw error;
    }
    const base =
      safeExportName(input.name)
        .replace(/\.pdf$/i, "")
        .slice(0, 120) || "document";
    const names = new Set(directory.list().map((entry) => entry.name));
    let name = `${base}.pdf`;
    for (let suffix = 1; names.has(name); suffix += 1) name = `${base} (${suffix}).pdf`;
    const destination = directory.createFile(name, "application/pdf");
    try {
      const source = new File(input.uri);
      if (destination.uri.startsWith("content://")) {
        // SDK 57 File.copy(overwrite) deletes a SAF document before writing its URI.
        // Use the native async stream writer instead; imported PDFs are capped at 20 MB.
        await writeAsStringAsync(destination.uri, await source.base64(), {
          encoding: EncodingType.Base64,
        });
      } else {
        await source.copy(destination, { overwrite: true });
      }
    } catch (error) {
      try {
        destination.delete();
      } catch {
        /* The provider may have revoked access. */
      }
      throw error;
    }
    return "saved";
  }
}

function safeExportName(name: string): string {
  const sanitized = name.trim().replaceAll(/[/\\:\0]/g, "-");
  return sanitized || "document";
}
