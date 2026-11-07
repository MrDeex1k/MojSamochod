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
    const result = await DocumentPicker.getDocumentAsync({
      // iOS needs a stable private copy after dismissal; Android retains its granted URI.
      copyToCacheDirectory: Platform.OS === "ios",
      multiple: false,
      type: [...supportedDocumentMimeTypes],
    });
    if (result.canceled) return { kind: "cancelled" };
    const asset = result.assets[0];
    if (!asset) return { kind: "unsupported" };
    if (asset.size !== undefined && asset.size > maximumDocumentBytes) {
      return { kind: "invalid-size" };
    }
    const mimeType = normalizeMimeType(asset.mimeType, asset.name);
    if (!mimeType) return { kind: "unsupported" };
    return {
      document: { mimeType, name: asset.name, size: asset.size, uri: asset.uri },
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
