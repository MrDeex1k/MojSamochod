import * as DocumentPicker from "expo-document-picker";

import { maximumDocumentBytes } from "@/application/storage/object-storage";

export const supportedDocumentMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const;

export type PickedDocument = Readonly<{
  mimeType: (typeof supportedDocumentMimeTypes)[number];
  name: string;
  size?: number;
  uri: string;
}>;

export type DocumentPickResult =
  | Readonly<{ kind: "cancelled" }>
  | Readonly<{ kind: "invalid-size" }>
  | Readonly<{ kind: "unsupported" }>
  | Readonly<{ document: PickedDocument; kind: "selected" }>;

export interface DocumentFilePicker {
  pick(): Promise<DocumentPickResult>;
}

export class SystemDocumentPicker implements DocumentFilePicker {
  async pick(): Promise<DocumentPickResult> {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
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
