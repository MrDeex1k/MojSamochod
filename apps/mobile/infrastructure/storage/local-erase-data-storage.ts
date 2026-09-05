import { Directory, File, Paths } from "expo-file-system";
import type { EraseDataStorage } from "@/application/storage/erase-all-data";
import type { AppDatabase } from "@/infrastructure/database/database";
import { clearUserData } from "@/infrastructure/database/clear-user-data";

export class LocalEraseDataStorage implements EraseDataStorage {
  private readonly marker = new File(Paths.document, "erase-data-pending");
  constructor(private readonly database: AppDatabase) {}

  async isPending() {
    return this.marker.exists;
  }
  async begin() {
    if (!this.marker.exists) this.marker.create();
  }
  async clearDatabase() {
    clearUserData(this.database);
  }
  async clearFiles() {
    for (const directory of [
      new Directory(Paths.document, "managed-objects"),
      new Directory(Paths.cache, "document-previews"),
      new Directory(Paths.cache, "document-exports"),
    ]) {
      if (directory.exists) directory.delete();
    }
  }
  async finish() {
    if (this.marker.exists) this.marker.delete();
  }
}
