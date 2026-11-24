import { documentImport } from "@/modules/document-preview/src/DocumentImportModule";
import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

import { maximumDocumentBytes } from "@/application/storage/object-storage";

import type {
  DocumentFilePicker,
  DocumentPickResult,
  PickedDocument,
} from "@/application/documents/document-file-picker";
export type {
  DocumentFilePicker,
  DocumentPickResult,
  PickedDocument,
} from "@/application/documents/document-file-picker";
import { supportedDocumentMimeTypes } from "@/application/documents/document-file-picker";
export { supportedDocumentMimeTypes } from "@/application/documents/document-file-picker";
export class SystemDocumentPicker implements DocumentFilePicker {
  async pick(): Promise<DocumentPickResult> {
    if (Platform.OS === "ios") return documentImport().pick(maximumDocumentBytes);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
      multiple: false,
      type: [...supportedDocumentMimeTypes],
    });
    if (result.canceled) return { kind: "cancelled" };
    const asset = result.assets[0];
    if (!asset) return { kind: "unsupported" };
    const size = typeof asset.size === "number" && asset.size >= 0 ? asset.size : undefined;
    if (size !== undefined && (size === 0 || size > maximumDocumentBytes)) {
      return { kind: "invalid-size" };
    }
    const mimeType = normalizeMimeType(asset.mimeType, asset.name);
    if (!mimeType) return { kind: "unsupported" };
    return {
      document: { mimeType, name: asset.name, size, uri: asset.uri },
      kind: "selected",
    };
  }
}

function normalizeMimeType(
  mimeType: string | undefined,
  name: string,
): PickedDocument["mimeType"] | null {
  const normalized = mimeType?.toLowerCase();
  if (supportedDocumentMimeTypes.includes(normalized as PickedDocument["mimeType"])) {
    return normalized as PickedDocument["mimeType"];
  }
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return null;
}
