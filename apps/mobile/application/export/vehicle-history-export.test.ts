import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { createRefuelling, type Refuelling } from "@/domain/refuelling/refuelling";

import {
  createVehicleHistoryExport,
  serializeVehicleHistoryExport,
  vehicleHistoryExportFormat,
  vehicleHistoryExportVersion,
} from "./vehicle-history-export";

const exportedAt = new Date("2026-08-30T18:30:00.000Z");

describe("vehicle history export", () => {
  it("exports domain data as the documented version 3 format", async () => {
    const fixture = createDevelopmentVehicleHistoryFixture();
    const refuelling = refuellingFixture(fixture.vehicle.id);
    const dependencies = {
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn().mockResolvedValue(repositorySuccess(fixture.entries)),
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository: refuellingsFake([refuelling]),
      vehicleDocumentRepository: documentsFake(),
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(repositorySuccess(fixture.vehicle)),
        update: jest.fn(),
      },
    };

    const result = await createVehicleHistoryExport(dependencies);

    expect(result).toMatchObject({
      ok: true,
      value: {
        binaryFilesIncluded: false,
        exportedAt: exportedAt.toISOString(),
        format: vehicleHistoryExportFormat,
        formatVersion: vehicleHistoryExportVersion,
      },
    });
    if (!result.ok) throw new Error("Expected a successful export");
    expect(result.value.data.vehicle).toMatchObject({
      id: fixture.vehicle.id,
      fuelConsumptionUnitPreference: "litresPer100Kilometres",
      fuelTankCapacityMicrolitres: 60_000_000,
      fuelVolumeUnitPreference: "litres",
      initialOdometerMetres: 82_000_000,
      make: "Volvo",
      model: "V60",
    });
    expect(result.value.data.historyEntries).toHaveLength(3);
    expect(result.value.data.documents).toEqual([]);
    expect(result.value.data.refuellings).toEqual([
      {
        createdAt: refuelling.createdAt,
        fillKind: "full",
        id: refuelling.id,
        inputVolumeUnit: "litres",
        occurredAt: refuelling.occurredAt,
        odometerMetres: 99_000_000,
        pricing: {
          inputMode: "total",
          totalCost: { currency: "PLN", minorUnits: 30_000 },
          unitPriceMilliUnits: 6_667,
          unitPriceVolumeUnit: "litres",
        },
        quantityMicrolitres: 45_000_000,
        updatedAt: refuelling.updatedAt,
        vehicleId: fixture.vehicle.id,
      },
    ]);
    expect(JSON.stringify(result.value)).not.toContain("photoReference");
    expect(JSON.stringify(result.value)).not.toContain("totalDistanceMetres");
    expect(dependencies.historyEntryRepository.list).toHaveBeenCalledWith(fixture.vehicle.id);
    expect(dependencies.refuellingRepository.list).toHaveBeenCalledWith(fixture.vehicle.id);
  });

  it("exports a valid empty document when no vehicle exists", async () => {
    const historyList = jest.fn();

    const result = await createVehicleHistoryExport({
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: historyList,
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository: refuellingsFake(),
      vehicleDocumentRepository: documentsFake(),
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(repositorySuccess(null)),
        update: jest.fn(),
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        binaryFilesIncluded: false,
        data: { documents: [], historyEntries: [], refuellings: [], vehicle: null },
        exportedAt: exportedAt.toISOString(),
        format: vehicleHistoryExportFormat,
        formatVersion: vehicleHistoryExportVersion,
      },
    });
    expect(historyList).not.toHaveBeenCalled();
  });

  it("propagates repository failures without emitting a partial export", async () => {
    const failure = repositoryFailure("unavailable", "vehicle.get", new Error("Unavailable"));

    const result = await createVehicleHistoryExport({
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository: refuellingsFake(),
      vehicleDocumentRepository: documentsFake(),
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(failure),
        update: jest.fn(),
      },
    });

    expect(result).toBe(failure);
  });

  it("stops before document lookup when refuelling records cannot be read", async () => {
    const fixture = createDevelopmentVehicleHistoryFixture();
    const failure = repositoryFailure("unavailable", "refuelling.list", new Error("Unavailable"));
    const documentRepository = documentsFake();
    const refuellingRepository = {
      ...refuellingsFake(),
      list: jest.fn().mockResolvedValue(failure),
    };

    const result = await createVehicleHistoryExport({
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn().mockResolvedValue(repositorySuccess(fixture.entries)),
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository,
      vehicleDocumentRepository: documentRepository,
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(repositorySuccess(fixture.vehicle)),
        update: jest.fn(),
      },
    });

    expect(result).toBe(failure);
    expect(refuellingRepository.list).toHaveBeenCalledWith(fixture.vehicle.id);
    expect(documentRepository.list).not.toHaveBeenCalled();
  });

  it("uses explicit nulls for legacy vehicles without fuel configuration", async () => {
    const fixture = createDevelopmentVehicleHistoryFixture();
    const legacyVehicle = {
      ...fixture.vehicle,
      fuelConsumptionUnitPreference: undefined,
      fuelTankCapacityMicrolitres: undefined,
      fuelVolumeUnitPreference: undefined,
    };

    const result = await createVehicleHistoryExport({
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn().mockResolvedValue(repositorySuccess(fixture.entries)),
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository: refuellingsFake(),
      vehicleDocumentRepository: documentsFake(),
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(repositorySuccess(legacyVehicle)),
        update: jest.fn(),
      },
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        data: {
          vehicle: {
            fuelConsumptionUnitPreference: null,
            fuelTankCapacityMicrolitres: null,
            fuelVolumeUnitPreference: null,
          },
        },
      },
    });
  });

  it("serializes a readable JSON document with a final newline", async () => {
    const fixture = createDevelopmentVehicleHistoryFixture();
    const result = await createVehicleHistoryExport({
      clock: { now: () => exportedAt },
      historyEntryRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn().mockResolvedValue(repositorySuccess(fixture.entries)),
        update: jest.fn(),
      },
      managedFileRepository: managedFilesFake(),
      refuellingRepository: refuellingsFake(),
      vehicleDocumentRepository: documentsFake(),
      vehicleRepository: {
        create: jest.fn(),
        delete: jest.fn(),
        get: jest.fn().mockResolvedValue(repositorySuccess(fixture.vehicle)),
        update: jest.fn(),
      },
    });
    if (!result.ok) throw new Error("Expected a successful export");

    const serialized = serializeVehicleHistoryExport(result.value);

    expect(serialized.endsWith("\n")).toBe(true);
    expect(JSON.parse(serialized)).toEqual(result.value);
  });
});

function documentsFake() {
  return {
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getByFile: jest.fn(),
    list: jest.fn().mockResolvedValue(repositorySuccess([])),
    update: jest.fn(),
  };
}

function managedFilesFake() {
  return {
    createStaged: jest.fn(),
    delete: jest.fn(),
    findReadyBySha256: jest.fn(),
    getReady: jest.fn(),
    listRecoverable: jest.fn(),
    listUnreferencedReadyFiles: jest.fn(),
    markDeleting: jest.fn(),
    markReady: jest.fn(),
  };
}

function refuellingsFake(refuellings: readonly Refuelling[] = []) {
  return {
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    list: jest.fn().mockResolvedValue(repositorySuccess(refuellings)),
    update: jest.fn(),
  };
}

function refuellingFixture(
  vehicleId: Parameters<typeof createRefuelling>[0]["vehicleId"],
): Refuelling {
  const result = createRefuelling(
    {
      fillKind: "full",
      inputVolumeUnit: "litres",
      occurredAt: "2026-08-30T17:00:00.000Z",
      odometerMetres: 99_000_000,
      pricing: {
        inputMode: "total",
        totalCost: { currency: "PLN", minorUnits: 30_000 },
        unitPriceMilliUnits: 6_667,
        unitPriceVolumeUnit: "litres",
      },
      quantityMicrolitres: 45_000_000,
      vehicleId,
    },
    {
      clock: { now: () => exportedAt },
      idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" },
    },
  );
  if (!result.ok) throw new Error("Expected a valid refuelling fixture");
  return result.value;
}
