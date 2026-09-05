import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import type { ApplicationServices } from "@/components/providers/application-provider";
import { createVehicle } from "@/domain/vehicle/vehicle";
import { WorkspaceDataSource } from "./workspace-data-source";

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
      listPage: jest.fn(async () => repositorySuccess({ entries: [], nextCursor: null })),
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
