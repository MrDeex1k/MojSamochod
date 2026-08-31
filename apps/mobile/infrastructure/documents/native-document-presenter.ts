import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";

export interface DocumentPresenter {
  share(input: Readonly<{ mimeType: string; name: string; uri: string }>): Promise<boolean>;
}

export class NativeDocumentPresenter implements DocumentPresenter {
  private readonly exportDirectory = new Directory(Paths.cache, "document-exports");

  async share(input: Readonly<{ mimeType: string; name: string; uri: string }>): Promise<boolean> {
    if (!(await Sharing.isAvailableAsync())) return false;
    this.exportDirectory.create({ idempotent: true, intermediates: true });
    const exportFile = new File(this.exportDirectory, safeExportName(input.name));
    await new File(input.uri).copy(exportFile, { overwrite: true });
    await Sharing.shareAsync(exportFile.uri, {
      dialogTitle: input.name,
      mimeType: input.mimeType,
      UTI: input.mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
    return true;
  }
}

function safeExportName(name: string): string {
  const sanitized = name.trim().replaceAll(/[/\\:\0]/g, "-");
  return sanitized || "document";
}
