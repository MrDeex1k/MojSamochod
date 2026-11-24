import { requireNativeModule } from "expo";
import type { DocumentPickResult } from "@/application/documents/document-file-picker";

export function documentImport() {
  return requireNativeModule<{
    pick(maximumBytes: number): Promise<DocumentPickResult>;
    copyToStaging(source: string, destination: string, maximumBytes: number): Promise<boolean>;
  }>("DocumentImport");
}
