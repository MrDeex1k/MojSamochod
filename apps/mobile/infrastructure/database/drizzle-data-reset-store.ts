import type { DataResetStore } from "@/application/maintenance/data-reset";
import type { AppDatabase } from "./database";
import { managedFiles, pendingDataReset, vehicles } from "./schema";

export class DrizzleDataResetStore implements DataResetStore {
  constructor(private readonly database: AppDatabase) {}

  async isPending(): Promise<boolean> {
    return !!this.database.select().from(pendingDataReset).get();
  }

  async markPending(): Promise<void> {
    this.database.insert(pendingDataReset).values({ id: 1 }).onConflictDoNothing().run();
  }

  async eraseRecords(): Promise<void> {
    this.database.transaction((transaction) => {
      // Foreign-key cascades remove history, details, documents, fuel and reminders.
      transaction.delete(vehicles).run();
      transaction.delete(managedFiles).run();
    });
  }

  async finish(): Promise<void> {
    this.database.delete(pendingDataReset).run();
  }
}
