/** @jest-environment node */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrationFileNames = [
  "0000_create_vehicle_history_schema.sql",
  "0001_add_managed_vehicle_photos.sql",
  "0002_add_vehicle_documents.sql",
  "0003_enforce_document_sha256_uniqueness.sql",
  "0004_enforce_document_entry_vehicle_consistency.sql",
  "0005_enforce_history_entry_document_vehicle_consistency.sql",
  "0006_add_refuelling_persistence.sql",
] as const;
const migrationSql = readMigrations(migrationFileNames);
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

  it("migrates an existing vehicle as a readable legacy record without fuel configuration", () => {
    const database = new DatabaseSync(createTemporaryDatabasePath());
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec(readMigrations(migrationFileNames.slice(0, 6)));
    insertVehicle(database);
    database.exec(readMigrations(migrationFileNames.slice(6)));

    expect(
      database
        .prepare(
          `SELECT fuel_tank_capacity_microlitres, fuel_volume_unit_preference,
                  fuel_consumption_unit_preference
           FROM vehicles WHERE id = ?`,
        )
        .get(vehicleId),
    ).toEqual({
      fuel_consumption_unit_preference: null,
      fuel_tank_capacity_microlitres: null,
      fuel_volume_unit_preference: null,
    });
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });

  it("keeps a refuelling and its pricing after reopening the database", () => {
    const databasePath = createTemporaryDatabasePath();
    const database = openMigratedDatabase(databasePath);
    insertVehicle(database);
    configureVehicleFuel(database);
    insertRefuelling(database);
    database.close();

    const reopened = new DatabaseSync(databasePath);
    reopened.exec("PRAGMA foreign_keys = ON;");
    expect(
      reopened
        .prepare(
          `SELECT quantity_microlitres, fill_kind, total_cost_minor_units,
                  total_cost_currency, unit_price_milli_units
           FROM refuellings WHERE id = ?`,
        )
        .get(refuellingId),
    ).toEqual({
      fill_kind: "full",
      quantity_microlitres: 45_000_000,
      total_cost_currency: "PLN",
      total_cost_minor_units: 30_000,
      unit_price_milli_units: 6_667,
    });
    reopened.close();
  });

  it("rejects incomplete fuel configuration and partial refuelling pricing", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertVehicle(database);

    expect(() =>
      database
        .prepare("UPDATE vehicles SET fuel_tank_capacity_microlitres = 60000000 WHERE id = ?")
        .run(vehicleId),
    ).toThrow(/vehicle fuel configuration is incomplete or invalid/);

    configureVehicleFuel(database);
    expect(() =>
      database
        .prepare(
          `INSERT INTO refuellings
            (id, vehicle_id, occurred_at, quantity_microlitres, input_volume_unit,
             fill_kind, pricing_input_mode, created_at, updated_at)
           VALUES (?, ?, ?, 45000000, 'litres', 'full', 'total', ?, ?)`,
        )
        .run(refuellingId, vehicleId, timestamp, timestamp, timestamp),
    ).toThrow();
    expect(database.prepare("SELECT count(*) AS count FROM refuellings").get()).toEqual({
      count: 0,
    });
    database.close();
  });

  it("rolls back a refuelling and odometer advancement when the transaction fails", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertVehicle(database);
    configureVehicleFuel(database);

    expect(() => {
      database.exec("BEGIN;");
      insertRefuelling(database);
      database
        .prepare("UPDATE vehicles SET current_odometer_metres = 85000000 WHERE id = ?")
        .run(vehicleId);
      database
        .prepare(
          `INSERT INTO refuellings
            (id, vehicle_id, occurred_at, quantity_microlitres, input_volume_unit,
             fill_kind, created_at, updated_at)
           VALUES (?, ?, ?, 0, 'litres', 'full', ?, ?)`,
        )
        .run(secondRefuellingId, vehicleId, timestamp, timestamp, timestamp);
      database.exec("COMMIT;");
    }).toThrow();
    database.exec("ROLLBACK;");

    expect(database.prepare("SELECT count(*) AS count FROM refuellings").get()).toEqual({
      count: 0,
    });
    expect(
      database.prepare("SELECT current_odometer_metres FROM vehicles WHERE id = ?").get(vehicleId),
    ).toEqual({ current_odometer_metres: 82_000_000 });
    database.close();
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

  it("atomically reserves one active document for a SHA-256 digest", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertManagedDocument(database, managedFileId);

    expect(() => insertManagedDocument(database, secondManagedFileId)).toThrow(
      /UNIQUE constraint failed/,
    );
    expect(
      database
        .prepare(
          "SELECT count(*) AS count FROM managed_files WHERE kind = 'document' AND sha256 = ?",
        )
        .get("cd".repeat(32)),
    ).toEqual({ count: 1 });
    database.close();
  });

  it("rejects a document relation to a history entry owned by another vehicle", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertVehicle(database);
    insertSecondVehicle(database);
    insertHistoryEntry(database, secondVehicleId);
    insertReadyManagedDocument(database);

    expect(() =>
      database
        .prepare(
          `INSERT INTO vehicle_documents
            (id, vehicle_id, history_entry_id, file_reference, name, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Invoice', ?, ?)`,
        )
        .run(documentId, vehicleId, entryId, managedFileId, timestamp, timestamp),
    ).toThrow(/vehicle document history entry belongs to another vehicle/);
    expect(database.prepare("SELECT count(*) AS count FROM vehicle_documents").get()).toEqual({
      count: 0,
    });
    database
      .prepare(
        `INSERT INTO vehicle_documents
          (id, vehicle_id, history_entry_id, file_reference, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Invoice', ?, ?)`,
      )
      .run(documentId, secondVehicleId, entryId, managedFileId, timestamp, timestamp);
    expect(() =>
      database
        .prepare("UPDATE vehicle_documents SET vehicle_id = ? WHERE id = ?")
        .run(vehicleId, documentId),
    ).toThrow(/vehicle document history entry belongs to another vehicle/);
    expect(
      database.prepare("SELECT vehicle_id FROM vehicle_documents WHERE id = ?").get(documentId),
    ).toEqual({ vehicle_id: secondVehicleId });
    database.close();
  });

  it("rejects moving a history entry away from its document's vehicle", () => {
    const database = openMigratedDatabase(createTemporaryDatabasePath());
    insertVehicle(database);
    insertSecondVehicle(database);
    insertHistoryEntry(database, vehicleId);
    insertReadyManagedDocument(database);
    database
      .prepare(
        `INSERT INTO vehicle_documents
          (id, vehicle_id, history_entry_id, file_reference, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Invoice', ?, ?)`,
      )
      .run(documentId, vehicleId, entryId, managedFileId, timestamp, timestamp);

    expect(() =>
      database
        .prepare("UPDATE history_entries SET vehicle_id = ? WHERE id = ?")
        .run(secondVehicleId, entryId),
    ).toThrow(/history entry document belongs to another vehicle/);
    expect(
      database.prepare("SELECT vehicle_id FROM history_entries WHERE id = ?").get(entryId),
    ).toEqual({ vehicle_id: vehicleId });
    database.close();
  });

  it("detaches a pre-existing mismatched relation while migrating the schema", () => {
    const database = new DatabaseSync(createTemporaryDatabasePath());
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec(readMigrations(migrationFileNames.slice(0, 4)));
    insertVehicle(database);
    insertSecondVehicle(database);
    insertHistoryEntry(database, secondVehicleId);
    insertReadyManagedDocument(database);
    database
      .prepare(
        `INSERT INTO vehicle_documents
          (id, vehicle_id, history_entry_id, file_reference, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Invoice', ?, ?)`,
      )
      .run(documentId, vehicleId, entryId, managedFileId, timestamp, timestamp);

    database.exec("BEGIN;");
    database.exec(readMigrations(migrationFileNames.slice(4)));
    database.exec("COMMIT;");

    expect(
      database
        .prepare("SELECT vehicle_id, history_entry_id FROM vehicle_documents WHERE id = ?")
        .get(documentId),
    ).toEqual({ history_entry_id: null, vehicle_id: vehicleId });
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });
});

const vehicleId = "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f";
const entryId = "018f47e2-7b30-7b80-99c0-81b80d9a57ce";
const managedFileId = "018f47e2-7b31-7658-b336-34613389d00f";
const secondManagedFileId = "018f47e2-7b32-7658-b336-34613389d00f";
const secondVehicleId = "018f47e2-7b33-7658-b336-34613389d00f";
const documentId = "018f47e2-7b34-7658-b336-34613389d00f";
const refuellingId = "018f47e2-7b35-7658-b336-34613389d00f";
const secondRefuellingId = "018f47e2-7b36-7658-b336-34613389d00f";
const timestamp = "2026-08-30T10:15:00.000Z";

function createTemporaryDatabasePath(): string {
  const directory = mkdtempSync(join(tmpdir(), "moje-auto-sqlite-test-"));
  temporaryDirectories.push(directory);
  return join(directory, "persistence.db");
}

function readMigrations(fileNames: readonly string[]): string {
  return fileNames
    .map((fileName) => readFileSync(join(__dirname, "migrations", fileName), "utf8"))
    .join("\n")
    .replaceAll("--> statement-breakpoint", "");
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

function insertSecondVehicle(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO vehicles
        (id, make, model, distance_unit_preference, created_at, updated_at)
       VALUES (?, 'BMW', 'M2', 'kilometres', ?, ?)`,
    )
    .run(secondVehicleId, timestamp, timestamp);
}

function configureVehicleFuel(database: DatabaseSync): void {
  database
    .prepare(
      `UPDATE vehicles
       SET fuel_tank_capacity_microlitres = 60000000,
           fuel_volume_unit_preference = 'litres',
           fuel_consumption_unit_preference = 'litresPer100Kilometres'
       WHERE id = ?`,
    )
    .run(vehicleId);
}

function insertRefuelling(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO refuellings
        (id, vehicle_id, occurred_at, odometer_metres, quantity_microlitres,
         input_volume_unit, fill_kind, pricing_input_mode, total_cost_minor_units,
         total_cost_currency, unit_price_milli_units, unit_price_volume_unit,
         created_at, updated_at)
       VALUES (?, ?, ?, 85000000, 45000000, 'litres', 'full', 'total', 30000,
               'PLN', 6667, 'litres', ?, ?)`,
    )
    .run(refuellingId, vehicleId, timestamp, timestamp, timestamp);
}

function insertHistoryEntry(database: DatabaseSync, ownerVehicleId: string): void {
  database
    .prepare(
      `INSERT INTO history_entries
        (id, vehicle_id, type, occurred_at, created_at, updated_at)
       VALUES (?, ?, 'repair', ?, ?, ?)`,
    )
    .run(entryId, ownerVehicleId, timestamp, timestamp, timestamp);
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

function insertManagedDocument(database: DatabaseSync, id: string): void {
  database
    .prepare(
      `INSERT INTO managed_files
        (id, kind, status, staging_key, mime_type, original_name, byte_size, sha256,
         created_at, updated_at)
       VALUES (?, 'document', 'staged', ?, 'application/pdf', 'invoice.pdf', 3, ?, ?, ?)`,
    )
    .run(id, `staging/${id}.pdf`, "cd".repeat(32), timestamp, timestamp);
}

function insertReadyManagedDocument(database: DatabaseSync): void {
  database
    .prepare(
      `INSERT INTO managed_files
        (id, kind, status, storage_key, mime_type, original_name, byte_size, sha256,
         created_at, updated_at)
       VALUES (?, 'document', 'ready', ?, 'application/pdf', 'invoice.pdf', 3, ?, ?, ?)`,
    )
    .run(managedFileId, `objects/${managedFileId}.pdf`, "ef".repeat(32), timestamp, timestamp);
}
