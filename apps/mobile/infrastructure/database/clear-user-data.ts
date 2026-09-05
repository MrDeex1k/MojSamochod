import type { AppDatabase } from "./database";
import { managedFiles, vehicles } from "./schema";

export function clearUserData(database: AppDatabase): void {
  database.transaction((transaction) => {
    transaction.delete(vehicles).run();
    transaction.delete(managedFiles).run();
  });
}
