const mockExecAsync = jest.fn();
const mockCloseAsync = jest.fn();
const mockOpenDatabaseAsync = jest.fn();
const mockDrizzle = jest.fn();
const mockMigrate = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: (...arguments_: unknown[]) => mockOpenDatabaseAsync(...arguments_),
}));

jest.mock("drizzle-orm/expo-sqlite", () => ({
  drizzle: (...arguments_: unknown[]) => mockDrizzle(...arguments_),
}));

jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
  migrate: (...arguments_: unknown[]) => mockMigrate(...arguments_),
}));

jest.mock("./migrations/migrations", () => ({
  __esModule: true,
  default: { journal: { entries: [] }, migrations: {} },
}));

import { databaseName, initializeDatabase } from "./database";

describe("initializeDatabase", () => {
  beforeEach(() => {
    mockExecAsync.mockResolvedValue(undefined);
    mockCloseAsync.mockResolvedValue(undefined);
    mockOpenDatabaseAsync.mockResolvedValue({
      closeAsync: mockCloseAsync,
      execAsync: mockExecAsync,
    });
    mockDrizzle.mockReturnValue({ kind: "drizzle-database" });
    mockMigrate.mockResolvedValue(undefined);
  });

  it("configures SQLite and applies migrations before returning the database", async () => {
    const handle = await initializeDatabase();

    expect(databaseName).toBe("moje_auto.db");
    expect(mockOpenDatabaseAsync).toHaveBeenCalledWith("moje_auto.db");
    expect(mockExecAsync).toHaveBeenCalledWith(
      "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;",
    );
    expect(mockMigrate).toHaveBeenCalledWith(
      { kind: "drizzle-database" },
      { journal: { entries: [] }, migrations: {} },
    );
    expect(mockExecAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockMigrate.mock.invocationCallOrder[0],
    );
    expect(handle.database).toEqual({ kind: "drizzle-database" });

    await handle.close();
    expect(mockCloseAsync).toHaveBeenCalledTimes(1);
  });

  it("closes the SQLite connection when migration fails", async () => {
    mockMigrate.mockRejectedValue(new Error("Migration failed"));

    await expect(initializeDatabase()).rejects.toThrow("Migration failed");
    expect(mockCloseAsync).toHaveBeenCalledTimes(1);
  });
});
