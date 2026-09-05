/** @jest-environment node */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { eq } from "drizzle-orm";
import { ReminderService } from "@/application/reminders/reminder-service";
import {
  createReminder,
  type CreateReminderInput,
  type Reminder,
} from "@/domain/reminders/reminder";
import { reminderIdFromUuidV7, vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import { clearUserData } from "./clear-user-data";
import { DrizzleVehicleHistoryRepository } from "./drizzle-vehicle-history-repository";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { DrizzleReminderRepository } from "./drizzle-reminder-repository";
import { mapReminderRow, reminderValues } from "./reminder-row-mapper";
import journal from "./migrations/meta/_journal.json";
import * as schema from "./schema";

const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const otherVehicleId = vehicleIdFromUuidV7("018f47e2-7b33-7658-b336-34613389d00f");
const id = reminderIdFromUuidV7("018f47e2-7b35-7658-b336-34613389d00f");
const otherId = reminderIdFromUuidV7("018f47e2-7b36-7658-b336-34613389d00f");
const clock = { now: () => new Date("2026-09-03T10:00:00.000Z") };
const input: CreateReminderInput = {
  dueDate: "2026-12-01",
  kind: "insurance",
  timeZone: "Europe/Warsaw",
  vehicleId,
};
const connections = new Set<DatabaseSync>();
const directories: string[] = [];

afterEach(() => {
  for (const connection of connections) connection.close();
  connections.clear();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("Reminder persistence with real SQLite and the Expo Drizzle driver", () => {
  it("upgrades an existing database without altering existing vehicle or history data", async () => {
    const { database, sqlite } = await open(":memory:", 7);
    seedVehicle(database);
    database
      .insert(schema.historyEntries)
      .values({
        id: otherId,
        vehicleId,
        type: "repair",
        occurredAt: clock.now().toISOString(),
        createdAt: clock.now().toISOString(),
        updatedAt: clock.now().toISOString(),
      })
      .run();
    const vehicleBefore = database.select().from(schema.vehicles).all();
    const historyBefore = database.select().from(schema.historyEntries).all();
    database
      .insert(schema.refuellings)
      .values({
        id,
        vehicleId,
        occurredAt: clock.now().toISOString(),
        quantityMicrolitres: 40_000_000,
        inputVolumeUnit: "litres",
        fillKind: "full",
        createdAt: clock.now().toISOString(),
        updatedAt: clock.now().toISOString(),
      })
      .run();
    const fuelBefore = database.select().from(schema.refuellings).all();
    await migrate(database, migrations());
    await migrate(database, migrations());
    expect(database.select().from(schema.vehicles).all()).toEqual(vehicleBefore);
    expect(database.select().from(schema.historyEntries).all()).toEqual(historyBefore);
    expect(database.select().from(schema.refuellings).all()).toEqual(fuelBefore);
    expect(database.select().from(schema.reminders).all()).toEqual([]);
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get()).toEqual({
      count: 8,
    });
  });

  it("keeps reminders, metadata and disabled notifications after closing and reopening", async () => {
    const directory = mkdtempSync(join(tmpdir(), "moje-auto-reminders-"));
    directories.push(directory);
    const path = join(directory, "test.db");
    const first = await open(path);
    seedVehicle(first.database);
    const original = fixture();
    expect(await first.repository.create(original)).toEqual({ ok: true, value: undefined });
    const updated = { ...original, notificationDaysBefore: [], updatedAt: original.updatedAt };
    expect(await first.repository.update(updated)).toEqual({ ok: true, value: undefined });
    first.sqlite.close();
    connections.delete(first.sqlite);
    const reopened = await open(path);
    expect(await reopened.repository.get(vehicleId, id)).toEqual({ ok: true, value: updated });
  });

  it("atomically rejects duplicate kinds and ids, while allowing both kinds and separate vehicles", async () => {
    const { repository, database } = await open();
    seedVehicle(database);
    seedVehicle(database, otherVehicleId);
    const results = await Promise.all([
      repository.create(fixture()),
      repository.create(fixture({ id: otherId })),
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, false]);
    expect(results[1]).toMatchObject({ error: { kind: "conflict" } });
    expect(await repository.create(fixture({ kind: "technicalInspection" }))).toMatchObject({
      error: { kind: "conflict" },
    });
    expect(
      (await repository.create(fixture({ id: otherId, kind: "technicalInspection" }))).ok,
    ).toBe(true);
    const thirdId = reminderIdFromUuidV7("018f47e2-7b37-7658-b336-34613389d00f");
    expect((await repository.create(fixture({ id: thirdId, vehicleId: otherVehicleId }))).ok).toBe(
      true,
    );
    expect(await repository.list(vehicleId)).toMatchObject({
      value: [{ kind: "insurance" }, { kind: "technicalInspection" }],
    });
    expect(await repository.list(otherVehicleId)).toMatchObject({ value: [{ id: thirdId }] });
    expect(() =>
      database
        .insert(schema.reminders)
        .values(reminderValues(fixture({ id: thirdId })))
        .run(),
    ).toThrow();
  });

  it("isolates reads, edits and deletes by vehicle ownership", async () => {
    const { repository, database } = await open();
    seedVehicle(database);
    await repository.create(fixture());
    expect(await repository.get(otherVehicleId, id)).toEqual({ ok: true, value: null });
    expect(await repository.update(fixture({ vehicleId: otherVehicleId }))).toMatchObject({
      error: { kind: "not-found" },
    });
    expect(await repository.delete(otherVehicleId, id)).toMatchObject({
      error: { kind: "not-found" },
    });
    expect(await repository.get(vehicleId, id)).toEqual({ ok: true, value: fixture() });
    expect((await repository.delete(vehicleId, id)).ok).toBe(true);
    expect(await repository.get(vehicleId, id)).toEqual({ ok: true, value: null });
    expect(await repository.delete(vehicleId, id)).toMatchObject({ error: { kind: "not-found" } });
  });

  it("rejects creation without a parent and cascades vehicle deletion", async () => {
    const { repository, database } = await open();
    expect(await repository.create(fixture())).toMatchObject({ error: { kind: "not-found" } });
    expect(() =>
      database.insert(schema.reminders).values(reminderValues(fixture())).run(),
    ).toThrow();
    seedVehicle(database);
    await repository.create(fixture());
    database.delete(schema.vehicles).where(eq(schema.vehicles.id, vehicleId)).run();
    expect(await repository.list(vehicleId)).toEqual({ ok: true, value: [] });
  });

  it("protects immutable metadata even when the repository is called directly", async () => {
    const { repository, database } = await open();
    seedVehicle(database);
    const original = fixture();
    await repository.create(original);
    for (const patch of [
      { kind: "technicalInspection" as const },
      { timeZone: fixture({ timeZone: "America/New_York" }).timeZone },
      { createdAt: "2026-01-01T00:00:00.000Z" as Reminder["createdAt"] },
    ]) {
      expect(await repository.update({ ...original, ...patch })).toMatchObject({
        error: { kind: "conflict" },
      });
    }
    expect(await repository.get(vehicleId, id)).toEqual({ ok: true, value: original });
  });

  it.each(["2026-02-30", "2026-13-01", "2026-01-00", "0000-01-01", "2026-1-01"])(
    "rejects malformed SQL dates: %s",
    async (dueDate) => {
      const { database } = await open();
      seedVehicle(database);
      expect(() =>
        database
          .insert(schema.reminders)
          .values({ ...reminderValues(fixture()), dueDate })
          .run(),
      ).toThrow();
    },
  );

  it("rejects invalid SQL flags, kinds and empty zones", async () => {
    const { sqlite, repository, database } = await open();
    seedVehicle(database);
    await repository.create(fixture());
    for (const sql of [
      "UPDATE reminders SET notify_on_due_date = 2",
      "UPDATE reminders SET kind = 'oil'",
      "UPDATE reminders SET time_zone = ''",
    ]) {
      expect(() => sqlite.exec(sql)).toThrow();
    }
    expect(await repository.get(vehicleId, id)).toEqual({ ok: true, value: fixture() });
  });

  it("reports corrupt stored zones instead of defaulting to the device zone", async () => {
    const { repository, database, sqlite } = await open();
    seedVehicle(database);
    await repository.create(fixture());
    sqlite.exec("UPDATE reminders SET time_zone = 'Mars/Olympus'");
    expect(await repository.get(vehicleId, id)).toMatchObject({ error: { kind: "corrupt-data" } });
    expect(await repository.list(vehicleId)).toMatchObject({ error: { kind: "corrupt-data" } });
    expect(await repository.update(fixture())).toMatchObject({ error: { kind: "corrupt-data" } });
  });

  it("returns unavailable when storage is closed", async () => {
    const { repository, sqlite } = await open();
    sqlite.close();
    connections.delete(sqlite);
    for (const result of await Promise.all([
      repository.get(vehicleId, id),
      repository.list(vehicleId),
      repository.create(fixture()),
      repository.update(fixture()),
      repository.delete(vehicleId, id),
    ])) {
      expect(result).toMatchObject({ error: { kind: "unavailable" } });
    }
  });

  it("rolls back an edit if SQLite aborts the write", async () => {
    const { repository, database, sqlite } = await open();
    seedVehicle(database);
    await repository.create(fixture());
    sqlite.exec(
      "CREATE TRIGGER fail_reminder_edit AFTER UPDATE ON reminders BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;",
    );
    expect(await repository.update(fixture({ dueDate: "2027-01-01" }))).toMatchObject({
      error: { kind: "unavailable" },
    });
    expect(await repository.get(vehicleId, id)).toEqual({ ok: true, value: fixture() });
  });

  it("supports service CRUD while rejecting duplicate kinds and invalid edits", async () => {
    const { repository, database } = await open();
    seedVehicle(database);
    const service = new ReminderService(clock, { generate: () => id }, repository);
    expect(await service.create({ ...input, dueDate: "invalid" })).toMatchObject({
      error: { kind: "unsupported" },
    });
    expect((await service.create(input)).ok).toBe(true);
    expect(await service.create(input)).toMatchObject({ error: { kind: "conflict" } });
    expect(
      await service.update(vehicleId, id, { dueDate: "2027-01-01", notificationDaysBefore: [0] }),
    ).toMatchObject({
      value: { dueDate: "2027-01-01", notificationDaysBefore: [0], timeZone: "Europe/Warsaw" },
    });
    expect(
      await service.update(vehicleId, id, { dueDate: "bad", notificationDaysBefore: [] }),
    ).toMatchObject({ error: { kind: "unsupported" } });
    expect(
      await service.update(otherVehicleId, id, {
        dueDate: "2027-01-01",
        notificationDaysBefore: [],
      }),
    ).toMatchObject({ error: { kind: "not-found" } });
    expect(await service.get(vehicleId, id)).toMatchObject({ value: { dueDate: "2027-01-01" } });
    expect(await service.list(vehicleId)).toMatchObject({ value: [{ id }] });
    expect((await service.delete(vehicleId, id)).ok).toBe(true);
    expect((await service.create(input)).ok).toBe(true);
  });
});

describe("Reminder row validation", () => {
  it.each([
    { id: "invalid" },
    { vehicleId: "invalid" },
    { createdAt: "invalid" },
    { updatedAt: "invalid" },
    { dueDate: "2026-02-30" },
    { timeZone: "+02:00" },
    { notifyOneDayBefore: 2 },
    { kind: "oil" },
  ])("rejects corrupt persisted values %j", (patch) => {
    expect(() =>
      mapReminderRow({
        ...reminderValues(fixture()),
        ...patch,
      } as typeof schema.reminders.$inferSelect),
    ).toThrow();
  });
});

function fixture(patch: Partial<CreateReminderInput> & { id?: Reminder["id"] } = {}): Reminder {
  const result = createReminder(
    { ...input, ...patch },
    { clock, idGenerator: { generate: () => patch.id ?? id } },
  );
  if (!result.ok) throw new Error("Invalid reminder fixture");
  return result.value;
}

it("paginates tied timeline dates without duplicates, gaps or another vehicle's records", async () => {
  const { database } = await open();
  seedVehicle(database);
  seedVehicle(database, otherVehicleId);
  const repository = new DrizzleVehicleHistoryRepository(database);
  for (let index = 0; index < 123; index += 1) {
    const entry = createHistoryEntry(
      {
        type: "repair",
        details: { subject: `Repair ${index}` },
        occurredAt: clock.now().toISOString(),
        vehicleId,
      },
      {
        clock,
        idGenerator: {
          generate: () => `018f47e2-7b33-7000-8000-${String(index).padStart(12, "0")}`,
        },
      },
    );
    if (!entry.ok) throw new Error("Invalid timeline fixture");
    expect(await repository.create(entry.value)).toMatchObject({ ok: true });
  }
  const ids: string[] = [];
  let cursor: Parameters<typeof repository.listPage>[1];
  do {
    const page = await repository.listPage(vehicleId, cursor, 17);
    if (!page.ok) throw new Error("Expected a timeline page");
    expect(page.value.entries.length).toBeLessThanOrEqual(17);
    ids.push(...page.value.entries.map((entry) => entry.id));
    cursor = page.value.nextCursor ?? undefined;
  } while (cursor);
  const all = await repository.list(vehicleId);
  if (!all.ok) throw new Error("Expected timeline");
  expect(ids).toEqual(all.value.map((entry) => entry.id));
  expect(new Set(ids).size).toBe(123);
  expect(await repository.listPage(otherVehicleId)).toMatchObject({
    ok: true,
    value: { entries: [], nextCursor: null },
  });
});

it("clears user records atomically while retaining migrations and allowing a new vehicle", async () => {
  const { database, sqlite, repository } = await open();
  seedVehicle(database);
  expect(await repository.create(fixture())).toMatchObject({ ok: true });
  const before = sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get();
  sqlite.exec(
    "CREATE TRIGGER reject_erase BEFORE DELETE ON reminders BEGIN SELECT RAISE(ABORT, 'interrupted'); END;",
  );
  expect(() => clearUserData(database)).toThrow();
  expect(database.select().from(schema.vehicles).all()).toHaveLength(1);
  expect(database.select().from(schema.reminders).all()).toHaveLength(1);
  sqlite.exec("DROP TRIGGER reject_erase;");
  clearUserData(database);
  clearUserData(database);
  expect(database.select().from(schema.vehicles).all()).toHaveLength(0);
  expect(database.select().from(schema.reminders).all()).toHaveLength(0);
  expect(sqlite.prepare("SELECT count(*) AS count FROM __drizzle_migrations").get()).toEqual(
    before,
  );
  seedVehicle(database);
  expect(database.select().from(schema.vehicles).all()).toHaveLength(1);
});

function migrations(count = journal.entries.length) {
  const entries = journal.entries.slice(0, count);
  return {
    journal: { entries },
    migrations: Object.fromEntries(
      entries.map((entry) => [
        `m${String(entry.idx).padStart(4, "0")}`,
        readFileSync(join(__dirname, "migrations", `${entry.tag}.sql`), "utf8"),
      ]),
    ),
  };
}

async function open(path = ":memory:", migrationCount = journal.entries.length) {
  const sqlite = new DatabaseSync(path);
  connections.add(sqlite);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  // Only the Expo SQLite transport is adapted. Drizzle SQL, transactions, migrations and
  // constraints execute against real SQLite rather than mocked query builders.
  const client = {
    prepareSync: (sql: string) => ({
      executeSync: (params: SQLInputValue[]) => {
        const statement = sqlite.prepare(sql);
        if (statement.columns().length > 0) {
          const rows = statement.all(...params);
          return { getAllSync: () => rows, getFirstSync: () => rows[0] };
        }
        const result = statement.run(...params);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
      executeForRawResultSync: (params: SQLInputValue[]) => {
        const statement = sqlite.prepare(sql);
        statement.setReturnArrays(true);
        return { getAllSync: () => statement.all(...params) };
      },
    }),
  };
  const database = drizzle(client as unknown as Parameters<typeof drizzle>[0], { schema });
  await migrate(database, migrations(migrationCount));
  return { database, repository: new DrizzleReminderRepository(database), sqlite };
}

function seedVehicle(database: ReturnType<typeof drizzle<typeof schema>>, owner = vehicleId) {
  database
    .insert(schema.vehicles)
    .values({
      id: owner,
      make: "Volvo",
      model: "V40",
      distanceUnitPreference: "kilometres",
      createdAt: clock.now().toISOString(),
      updatedAt: clock.now().toISOString(),
    })
    .run();
}
