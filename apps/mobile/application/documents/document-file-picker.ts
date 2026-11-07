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
