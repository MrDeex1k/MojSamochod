/** @jest-environment node */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationSql = [
  "0000_create_vehicle_history_schema.sql",
  "0001_add_managed_vehicle_photos.sql",
]
  .map((fileName) => readFileSync(join(__dirname, "migrations", fileName), "utf8"))
  .join("\n")
  .replaceAll("--> statement-breakpoint", "");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("SQLite persistence resilience", () => {
  it("keeps committed data after the database file is closed and reopened", () => {
    const databasePath = createTemporaryDatabasePath();
    const firstConnection = openMigratedDatabase(databasePath);

    insertVehicle(firstConnection);
    firstConnection.close();

    const reopenedConnection = new DatabaseSync(databasePath);
    reopenedConnection.exec("PRAGMA foreign_keys = ON;");
    const storedVehicle = reopenedConnection
      .prepare("SELECT make, model, current_odometer_metres FROM vehicles WHERE id = ?")
      .get(vehicleId);
    reopenedConnection.close();

    expect(storedVehicle).toEqual({
      current_odometer_metres: 82_000_000,
      make: "Volvo",
      model: "V60",
    });
  });

  it("rolls back the whole write when a detail record violates the entry contract", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    let interruptedWrite: unknown;

    try {
      database.exec("BEGIN;");
      insertVehicle(database);
      database
        .prepare(
          `INSERT INTO history_entries
            (id, vehicle_id, type, occurred_at, created_at, updated_at)
           VALUES (?, ?, 'repair', ?, ?, ?)`,
        )
        .run(entryId, vehicleId, timestamp, timestamp, timestamp);
      database
        .prepare(
          `INSERT INTO inspection_details
            (history_entry_id, entry_type, kind, result)
           VALUES (?, 'inspection', 'technical', 'passed')`,
        )
        .run(entryId);
      database.exec("COMMIT;");
    } catch (error) {
      interruptedWrite = error;
      database.exec("ROLLBACK;");
    }

    const vehicleCount = database.prepare("SELECT count(*) AS count FROM vehicles").get();
    const entryCount = database.prepare("SELECT count(*) AS count FROM history_entries").get();
    database.close();

    expect(interruptedWrite).toBeDefined();
    expect(vehicleCount).toEqual({ count: 0 });
    expect(entryCount).toEqual({ count: 0 });
  });

  it("rejects invalid records at the SQLite boundary", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());

    expect(() =>
      database
        .prepare(
          `INSERT INTO vehicles
            (id, make, model, initial_odometer_metres, distance_unit_preference, created_at, updated_at)
           VALUES (?, '', 'V60', -1, 'yards', ?, ?)`,
        )
        .run(vehicleId, timestamp, timestamp),
    ).toThrow();

    expect(database.prepare("SELECT count(*) AS count FROM vehicles").get()).toEqual({ count: 0 });
    database.close();
  });

  it("sets a deleted managed photo reference to null without deleting the vehicle", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertManagedPhoto(database);
    insertVehicle(database, managedFileId);

    database.prepare("DELETE FROM managed_files WHERE id = ?").run(managedFileId);

    expect(
      database.prepare("SELECT photo_reference FROM vehicles WHERE id = ?").get(vehicleId),
    ).toEqual({ photo_reference: null });
    database.close();
  });

  it("keeps the vehicle photo relation and history after reopening", () => {
    const databasePath = createTemporaryDatabasePath();
    const database = openMigratedDatabase(databasePath);
    insertManagedPhoto(database);
    insertVehicle(database, managedFileId);
    database
      .prepare(
        `INSERT INTO history_entries
          (id, vehicle_id, type, occurred_at, odometer_metres, created_at, updated_at)
         VALUES (?, ?, 'replacement', ?, 85000000, ?, ?)`,
      )
      .run(entryId, vehicleId, timestamp, timestamp, timestamp);
    database
      .prepare(
        `INSERT INTO replacement_details (history_entry_id, entry_type, item)
         VALUES (?, 'replacement', 'Engine oil')`,
      )
      .run(entryId);
    database.close();

    const reopened = new DatabaseSync(databasePath);
    reopened.exec("PRAGMA foreign_keys = ON;");
    expect(
      reopened
        .prepare(
          `SELECT vehicles.photo_reference, history_entries.occurred_at, replacement_details.item
           FROM vehicles
           JOIN history_entries ON history_entries.vehicle_id = vehicles.id
           JOIN replacement_details ON replacement_details.history_entry_id = history_entries.id
           WHERE vehicles.id = ?`,
        )
        .get(vehicleId),
    ).toEqual({
      item: "Engine oil",
      occurred_at: timestamp,
      photo_reference: managedFileId,
    });
    reopened.close();
  });
});

const vehicleId = "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f";
const entryId = "018f47e2-7b30-7b80-99c0-81b80d9a57ce";
const managedFileId = "018f47e2-7b31-7658-b336-34613389d00f";
const timestamp = "2026-08-30T10:15:00.000Z";

function createTemporaryDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), "moje-auto-sqlite-test-"));
  temporaryDirectories.push(directory);
  return join(directory, "persistence.db");
}

function openMigratedDatabase(databasePath: string): DatabaseSync {
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(migrationSql);
  return database;
}

function insertVehicle(database: DatabaseSync, photoReference: string | null = null): void {
  database
    .prepare(
      `INSERT INTO vehicles
        (id, make, model, initial_odometer_metres, current_odometer_metres,
         distance_unit_preference, photo_reference, created_at, updated_at)
       VALUES (?, 'Volvo', 'V60', 82000000, 82000000, 'kilometres', ?, ?, ?)`,
    )
    .run(vehicleId, photoReference, timestamp, timestamp);
}

function insertManagedPhoto(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO managed_files
        (id, kind, status, storage_key, mime_type, original_name, byte_size, sha256,
         created_at, updated_at)
       VALUES (?, 'vehicle-photo', 'ready', ?, 'image/jpeg', 'vehicle.jpg', 3, ?, ?, ?)`,
    )
    .run(managedFileId, `objects/${managedFileId}.jpg`, "ab".repeat(32), timestamp, timestamp);
}
