import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import type { ApplicationServices } from "@/components/providers/application-provider";
import { createVehicle } from "@/domain/vehicle/vehicle";
import { WorkspaceDataSource } from "./workspace-data-source";
import type {
  HistoryCursor,
  HistoryPage,
} from "@/application/repositories/history-entry-repository";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import { createHistoryEntry } from "@/domain/history/history-entry";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";

function services() {
  const vehicle = createVehicle(
    {
      make: "Volvo",
      model: "V60",
      distanceUnitPreference: "kilometres",
      fuelConsumptionUnitPreference: "litresPer100Kilometres",
      fuelTankCapacityMicrolitres: 60000000,
      fuelVolumeUnitPreference: "litres",
    },
    {
      clock: { now: () => new Date("2026-09-05T08:00:00.000Z") },
      idGenerator: { generate: () => "018f47e2-7b2f-7cc8-98c4-dc0c0c07398f" },
    },
  );
  if (!vehicle.ok) throw new Error("Invalid fixture");
  return {
    vehicles: { get: jest.fn(async () => repositorySuccess(vehicle.value)) },
    historyEntries: {
      list: jest.fn(async () => repositorySuccess([])),
      listPage: jest.fn(
        async (
          _id: unknown,
          _cursor?: HistoryCursor,
          _limit?: number,
        ): Promise<RepositoryResult<HistoryPage>> =>
          repositorySuccess({ entries: [], nextCursor: null }),
      ),
    },
    documents: { list: jest.fn(async () => repositorySuccess([])) },
    refuellings: {
      list: jest.fn(async () => repositorySuccess({ consumption: {}, refuellings: [] })),
    },
  };
}

it("loads only the requested section and reuses cached results", async () => {
  const api = services();
  const source = new WorkspaceDataSource(api as unknown as ApplicationServices);
  expect(await source.load("history")).toMatchObject({ status: "ready" });
  expect(api.historyEntries.listPage).toHaveBeenCalledTimes(1);
  expect(api.historyEntries.list).not.toHaveBeenCalled();
  expect(api.documents.list).not.toHaveBeenCalled();
  expect(api.refuellings.list).not.toHaveBeenCalled();
  await source.load("fuel");
  await source.load("history");
  await source.load("fuel");
  expect(api.refuellings.list).toHaveBeenCalledTimes(1);
  source.invalidate("fuel");
  await source.load("fuel");
  expect(api.refuellings.list).toHaveBeenCalledTimes(2);
  expect(api.historyEntries.listPage).toHaveBeenCalledTimes(1);
});

it.each([0, 50, 250, 500])(
  "refreshes %i cached entries without overfetching or shrinking the initial page",
  async (target) => {
    const api = services();
    const records = Array.from({ length: target === 0 ? 0 : 650 }, (_, index) => {
      const entry = createHistoryEntry(
        {
          vehicleId: vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f"),
          type: "repair",
          details: { subject: `Record ${index}` },
          occurredAt: "2026-09-05T08:00:00.000Z",
        },
        {
          clock: { now: () => new Date("2026-09-05T08:00:00.000Z") },
          idGenerator: {
            generate: () => `01990000-0001-7000-8000-${String(index).padStart(12, "0")}`,
          },
        },
      );
      if (!entry.ok) throw new Error("Invalid history fixture");
      return entry.value;
    });
    api.historyEntries.listPage.mockImplementation(async (_id, cursor, limit = 50) => {
      const start = cursor ? records.findIndex((entry) => entry.id === cursor.id) + 1 : 0;
      const entries = records.slice(start, start + limit);
      const last = entries.at(-1);
      return repositorySuccess({
        entries,
        nextCursor:
          last && start + limit < records.length
            ? { id: last.id, occurredAt: last.occurredAt, createdAt: last.createdAt }
            : null,
      });
    });
    const source = new WorkspaceDataSource(api as unknown as ApplicationServices);
    await source.load("history");
    expect(api.historyEntries.listPage.mock.calls[0]?.[2]).toBe(50);
    for (let loaded = 50; loaded < target; loaded += 50) await source.loadMore();
    api.historyEntries.listPage.mockClear();
    source.invalidate("history");
    const refreshed = await source.load("history");
    expect(refreshed).toMatchObject({
      status: "ready",
      data: { entries: records.slice(0, target) },
    });
    expect(api.historyEntries.listPage).toHaveBeenCalledTimes(Math.max(1, Math.ceil(target / 100)));
    expect(api.historyEntries.listPage.mock.calls.map((call) => call[2])).toEqual(
      target === 0
        ? [50]
        : Array.from({ length: Math.ceil(target / 100) }, (_, index) =>
            Math.min(100, target - index * 100),
          ),
    );
    expect(source.hasMore()).toBe(target > 0);
    if (target > 0) {
      await source.loadMore();
      expect(await source.load("history")).toMatchObject({
        data: { entries: records.slice(0, target + 50) },
      });
    }
  },
);

it("keeps history accessible after a document load failure and retries the failed section", async () => {
  const api = services();
  api.documents.list.mockResolvedValueOnce(repositoryFailure("unavailable", "test") as never);
  const source = new WorkspaceDataSource(api as unknown as ApplicationServices);
  await source.load("history");
  expect(await source.load("documents")).toEqual({ status: "error" });
  expect(await source.load("history")).toMatchObject({ status: "ready" });
  expect(await source.load("documents")).toMatchObject({ status: "ready" });
  expect(api.historyEntries.listPage).toHaveBeenCalledTimes(1);
});
