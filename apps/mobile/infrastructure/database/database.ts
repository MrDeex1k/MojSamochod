import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseAsync } from "expo-sqlite";

import migrations from "./migrations/migrations";
import * as schema from "./schema";

export const databaseName = "moje_auto.db";

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

export type DatabaseHandle = {
  close: () => Promise<void>;
  database: AppDatabase;
};

export async function initializeDatabase(): Promise<DatabaseHandle> {
  const sqliteDatabase = await openDatabaseAsync(databaseName);

  try {
    await sqliteDatabase.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

    const database = drizzle(sqliteDatabase, { schema });
    await migrate(database, migrations);

    return {
      close: () => sqliteDatabase.closeAsync(),
      database,
    };
  } catch (error) {
    try {
      await sqliteDatabase.closeAsync();
    } catch {
      // Preserve the initialization error; it explains why the application cannot continue.
    }
    throw error;
  }
}
