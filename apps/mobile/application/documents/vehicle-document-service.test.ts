import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { createVehicleDocument } from "@/domain/documents/vehicle-document";
import { byteSize, sha256Digest, storageObjectKey } from "@/domain/files/managed-file";
import { managedFileIdFromUuidV7, vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import { utcTimestamp } from "@/domain/shared/value-objects";

import { VehicleDocumentService } from "./vehicle-document-service";

const fileId = "018f47e2-7b31-7658-b336-34613389d00f";
const replacementFileId = "018f47e2-7b32-7658-b336-34613389d00f";
const documentId = "018f47e2-7b33-7658-b336-34613389d00f";
const vehicleId = vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f");
const now = new Date("2026-08-31T08:00:00.000Z");
const picked = {
  mimeType: "application/pdf" as const,
  name: "invoice.pdf",
  size: 100,
  uri: "file:///invoice.pdf",
};

describe("VehicleDocumentService", () => {
  it("imports the managed file before creating document metadata", async () => {
    const events: string[] = [];
    const managedFiles = managedFilesFake(events);
    const repository = repositoryFake(events);
    const ids = [fileId, documentId];
    const service = new VehicleDocumentService(
      { now: () => now },
      { generate: () => ids.shift()! },
      repository,
      managedFiles,
    );

    const result = await service.create(vehicleId, picked, { name: "Invoice" });

    expect(result).toMatchObject({ ok: true, value: { id: documentId, name: "Invoice" } });
    expect(events).toEqual(["files.import", "documents.create"]);
  });

  it("removes the imported file when metadata creation fails", async () => {
    const events: string[] = [];
    const managedFiles = managedFilesFake(events);
    const repository = repositoryFake(events);
    repository.create = async () => repositoryFailure("unavailable", "test");
    const ids = [fileId, documentId];
    const service = new VehicleDocumentService(
      { now: () => now },
      { generate: () => ids.shift()! },
      repository,
      managedFiles,
    );

    await expect(service.create(vehicleId, picked, { name: "Invoice" })).resolves.toMatchObject({
      ok: false,
    });
    expect(events).toEqual(["files.import", `files.remove:${fileId}`]);
  });

  it("switches the relation before removing the previous binary during replacement", async () => {
    const events: string[] = [];
    const managedFiles = managedFilesFake(events, replacementFileId);
    const repository = repositoryFake(events);
    const existing = createVehicleDocument(
      {
        fileReference: managedFileIdFromUuidV7(fileId),
        name: "Invoice",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );
    if (!existing.ok) throw new Error("Expected a valid fixture");
    const service = new VehicleDocumentService(
      { now: () => new Date("2026-09-01T08:00:00.000Z") },
      { generate: () => replacementFileId },
      repository,
      managedFiles,
    );

    const result = await service.replace(existing.value, picked);

    expect(result).toMatchObject({
      ok: true,
      value: { fileReference: replacementFileId },
    });
    expect(events).toEqual(["files.import", "documents.update", `files.remove:${fileId}`]);
  });
});

function repositoryFake(events: string[]): VehicleDocumentRepository {
  return {
    create: async () => {
      events.push("documents.create");
      return repositorySuccess(undefined);
    },
    delete: async () => repositoryFailure("not-found", "test"),
    get: async () => repositorySuccess(null),
    getByFile: async () => repositorySuccess(null),
    list: async () => repositorySuccess([]),
    update: async () => {
      events.push("documents.update");
      return repositorySuccess(undefined);
    },
  };
}

function managedFilesFake(events: string[], importedId = fileId): ManagedFileCoordinator {
  const id = managedFileIdFromUuidV7(importedId);
  const timestamp = expectValid(utcTimestamp(now.toISOString(), "timestamp"));
  const metadata = {
    byteSize: expectValid(byteSize(100)),
    createdAt: timestamp,
    id,
    kind: "document" as const,
    mimeType: "application/pdf",
    originalName: "invoice.pdf",
    sha256: expectValid(sha256Digest("ab".repeat(32))),
    status: "ready" as const,
    storageKey: expectValid(storageObjectKey(`objects/${id}`)),
    updatedAt: timestamp,
  };
  return {
    getReady: async () => repositorySuccess(metadata),
    getReadyUri: async () => repositorySuccess(`file:///managed/${id}`),
    import: async () => {
      events.push("files.import");
      return repositorySuccess(metadata);
    },
    remove: async (value: typeof id) => {
      events.push(`files.remove:${value}`);
      return repositorySuccess(undefined);
    },
  } as unknown as ManagedFileCoordinator;
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected valid fixture");
  return result.value;
}
