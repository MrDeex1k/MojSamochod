import * as Sharing from "expo-sharing";

export interface DocumentPresenter {
  share(input: Readonly<{ mimeType: string; name: string; uri: string }>): Promise<boolean>;
}

export class NativeDocumentPresenter implements DocumentPresenter {
  async share(input: Readonly<{ mimeType: string; name: string; uri: string }>): Promise<boolean> {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(input.uri, {
      dialogTitle: input.name,
      mimeType: input.mimeType,
      UTI: input.mimeType === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
    return true;
  }
}
