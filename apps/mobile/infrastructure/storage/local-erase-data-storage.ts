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
    const managed = new Directory(Paths.document, "managed-objects");
    if (managed.exists) managed.delete();

    // The OS can purge the cache directory. Recreate it idempotently before listing:
    // Expo's exists also returns false for inaccessible paths, so do not skip errors.
    const cache = new Directory(Paths.cache);
    if (!cache.exists) cache.create({ idempotent: true });
    for (const entry of cache.list()) entry.delete();
  }
  async finish() {
    if (this.marker.exists) this.marker.delete();
  }
}
