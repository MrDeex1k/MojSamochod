/** @jest-environment node */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { vehicleIdFromUuidV7, historyEntryIdFromUuidV7 } from "@/domain/shared/identifiers";
import { calculateFuelConsumption } from "@/domain/refuelling/fuel-consumption";
import { DrizzleVehicleHistoryRepository } from "./drizzle-vehicle-history-repository";
import { DrizzleRefuellingRepository } from "./drizzle-refuelling-repository";
import { DrizzleVehicleDocumentRepository } from "./drizzle-vehicle-document-repository";
import * as schema from "./schema";

const stamp = "2026-09-01T00:00:00.000Z";
const id = (index: number) => `01990000-0001-7000-8000-${String(index).padStart(12, "0")}`;
const vehicleId = vehicleIdFromUuidV7(id(0));
let sqlite: DatabaseSync;
let history: DrizzleVehicleHistoryRepository;
let fuel: DrizzleRefuellingRepository;
let documents: DrizzleVehicleDocumentRepository;

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const directory = join(__dirname, "migrations");
  for (const file of readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(join(directory, file), "utf8"));
  // Exercise the production Expo Drizzle adapter against real SQLite, replacing only its native transport.
  const client = {
    prepareSync(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        executeForRawResultSync(params: SQLInputValue[]) {
          statement.setReturnArrays(true);
          return { getAllSync: () => statement.all(...params) };
        },
        executeSync(params: SQLInputValue[]) {
          return {
            getAllSync: () => statement.all(...params),
            getFirstSync: () => statement.get(...params),
            ...statement.run(...params),
          };
        },
      };
    },
  } as unknown as SQLiteDatabase;
  const database = drizzle(client, { schema });
  history = new DrizzleVehicleHistoryRepository(database);
  fuel = new DrizzleRefuellingRepository(database);
  documents = new DrizzleVehicleDocumentRepository(database);
  sqlite
    .prepare(
      "INSERT INTO vehicles (id,make,model,distance_unit_preference,fuel_tank_capacity_microlitres,fuel_volume_unit_preference,fuel_consumption_unit_preference,created_at,updated_at) VALUES (?,'QA','Test','kilometres',60000000,'litres','litresPer100Kilometres',?,?)",
    )
    .run(vehicleId, stamp, stamp);
});
afterEach(() => sqlite.close());

function addHistory(index: number, subject: string) {
  sqlite
    .prepare(
      "INSERT INTO history_entries (id,vehicle_id,type,occurred_at,created_at,updated_at,notes) VALUES (?,?,'repair',?,?,?,'Large private note')",
    )
    .run(id(index), vehicleId, stamp, stamp, stamp);
  sqlite
    .prepare("INSERT INTO repair_details (history_entry_id,subject) VALUES (?,?)")
    .run(id(index), subject);
}

it("pages references with tied timestamps and treats search metacharacters literally", async () => {
  for (let index = 1; index <= 105; index++) addHistory(index, `Repair ${index}`);
  addHistory(106, "100%_complete\\receipt");
  const first = await history.searchReferences(vehicleId, "");
  if (!first.ok) throw first.error;
  expect(first.value.entries).toHaveLength(50);
  expect(first.value.entries[0]).not.toHaveProperty("notes");
  const second = await history.searchReferences(vehicleId, "", first.value.nextCursor!);
  if (!second.ok) throw second.error;
  expect(second.value.entries[0]?.id).toBe(id(51));
  const third = await history.searchReferences(vehicleId, "", second.value.nextCursor!);
  if (!third.ok) throw third.error;
  expect(third.value.entries).toHaveLength(6);
  expect(third.value.nextCursor).toBeNull();
  const literal = await history.searchReferences(vehicleId, "%_complete\\");
  expect(literal).toMatchObject({ ok: true, value: { entries: [{ id: id(106) }] } });
  if (literal.ok) expect(literal.value.entries).toHaveLength(1);
  expect(
    await history.references(vehicleIdFromUuidV7(id(999)), [historyEntryIdFromUuidV7(id(1))]),
  ).toEqual({ ok: true, value: [] });
});

it("resolves references across bind-variable batches without losing records", async () => {
  for (let index = 1; index <= 1005; index++) addHistory(index, `Repair ${index}`);
  const ids = Array.from({ length: 1005 }, (_, index) => historyEntryIdFromUuidV7(id(index + 1)));
  const result = await history.references(vehicleId, ids);
  if (!result.ok) throw result.error;
  expect(result.value).toHaveLength(1005);
  expect(new Set(result.value.map((entry) => entry.id))).toEqual(new Set(ids));
});

it("counts only requested associations and supports an empty selection", async () => {
  addHistory(1, "Repair");
  addHistory(2, "Other repair");
  for (let index = 10; index < 13; index++) {
    sqlite
      .prepare(
        "INSERT INTO managed_files (id,kind,status,storage_key,mime_type,original_name,byte_size,sha256,created_at,updated_at) VALUES (?,'document','ready',?,'application/pdf','invoice.pdf',1,?,?,?)",
      )
      .run(id(index), `objects/${index}`, index.toString(16).padStart(64, "0"), stamp, stamp);
    sqlite
      .prepare(
        "INSERT INTO vehicle_documents (id,vehicle_id,history_entry_id,file_reference,name,created_at,updated_at) VALUES (?,?,?,?,'Invoice',?,?)",
      )
      .run(id(index), vehicleId, id(index === 12 ? 2 : 1), id(index), stamp, stamp);
  }
  expect(await documents.attachmentCounts(vehicleId, [historyEntryIdFromUuidV7(id(1))])).toEqual({
    ok: true,
    value: { [id(1)]: 2 },
  });
  expect(await documents.attachmentCounts(vehicleId, [])).toEqual({ ok: true, value: {} });
});

it("pages fuel records without changing consumption calculated from the complete projection", async () => {
  for (let index = 1; index <= 105; index++) {
    const date = new Date(Date.UTC(2026, 0, index)).toISOString();
    sqlite
      .prepare(
        "INSERT INTO refuellings (id,vehicle_id,occurred_at,odometer_metres,quantity_microlitres,input_volume_unit,fill_kind,created_at,updated_at) VALUES (?,?,?,?,40000000,'litres','full',?,?)",
      )
      .run(id(index), vehicleId, date, index * 500000, stamp, stamp);
  }
  const first = await fuel.listPage(vehicleId);
  if (!first.ok) throw first.error;
  expect(first.value.refuellings).toHaveLength(50);
  const second = await fuel.listPage(vehicleId, first.value.nextCursor!);
  if (!second.ok) throw second.error;
  expect(second.value.refuellings).toHaveLength(50);
  const third = await fuel.listPage(vehicleId, second.value.nextCursor!);
  if (!third.ok) throw third.error;
  expect(third.value.refuellings).toHaveLength(5);
  expect(third.value.nextCursor).toBeNull();
  const ids = [
    ...first.value.refuellings,
    ...second.value.refuellings,
    ...third.value.refuellings,
  ].map((record) => record.id);
  expect(new Set(ids).size).toBe(105);
  const all = await fuel.list(vehicleId);
  const projection = await fuel.consumptionRecords(vehicleId);
  if (!all.ok || !projection.ok) throw new Error("Query failed");
  expect(calculateFuelConsumption(projection.value)).toEqual(calculateFuelConsumption(all.value));
  expect(calculateFuelConsumption(projection.value).intervals).toHaveLength(104);
});
