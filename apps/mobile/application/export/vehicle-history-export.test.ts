import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";

import {
  createVehicleHistoryExport,
  serializeVehicleHistoryExport,
  vehicleHistoryExportFormat,
  vehicleHistoryExportVersion,
} from "./vehicle-history-export";

const exportedAt = new Date("2026-08-30T18:30:00.000Z");

describe("vehicle history export", () => {
  it("exports domain data as the documented version 2 format", async () => {
    const fixture = createDevelopmentVehicleHistoryFixture();
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
      initialOdometerMetres: 82_000_000,
      make: "Volvo",
      model: "V60",
    });
    expect(result.value.data.historyEntries).toHaveLength(3);
    expect(result.value.data.documents).toEqual([]);
    expect(JSON.stringify(result.value)).not.toContain("photoReference");
    expect(dependencies.historyEntryRepository.list).toHaveBeenCalledWith(fixture.vehicle.id);
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
        data: { documents: [], historyEntries: [], vehicle: null },
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
