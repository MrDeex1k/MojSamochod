import { maximumDocumentBytes } from "@/application/storage/object-storage";
import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import type { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { createVehicleDocument } from "@/domain/documents/vehicle-document";
import { byteSize, sha256Digest, storageObjectKey } from "@/domain/files/managed-file";
import {
  historyEntryIdFromUuidV7,
  managedFileIdFromUuidV7,
  vehicleIdFromUuidV7,
} from "@/domain/shared/identifiers";
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
  it("rejects invalid metadata before any file operation", async () => {
    const events: string[] = [];
    const service = new VehicleDocumentService(
      { now: () => now },
      { generate: () => fileId },
      repositoryFake(events),
      managedFilesFake(events),
    );
    expect(
      await service.create(vehicleId, picked, { name: "Invoice", documentDate: "2026-02-30" }),
    ).toMatchObject({ ok: false, error: { kind: "unsupported" } });
    expect(events).toEqual([]);
  });

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
    repository.get = async () => repositorySuccess(existing.value);
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

it("serializes replacement and stale metadata edits without restoring the removed file", async () => {
  const events: string[] = [];
  const existing = createVehicleDocument(
    { fileReference: managedFileIdFromUuidV7(fileId), name: "Invoice", vehicleId },
    { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
  );
  if (!existing.ok) throw new Error("Invalid fixture");
  let stored = existing.value;
  const repository = repositoryFake(events);
  repository.get = async () => repositorySuccess(stored);
  repository.update = async (value) => {
    stored = value;
    return repositorySuccess(undefined);
  };
  const files = managedFilesFake(events, replacementFileId);
  const service = new VehicleDocumentService(
    { now: () => now },
    { generate: () => replacementFileId },
    repository,
    files,
  );
  const [replaced, edited] = await Promise.all([
    service.replace(existing.value, picked),
    service.update(existing.value, { name: "Renamed invoice" }),
  ]);
  expect(replaced.ok).toBe(true);
  expect(edited.ok).toBe(true);
  expect(stored).toMatchObject({ name: "Renamed invoice", fileReference: replacementFileId });
  expect(events).toEqual(["files.import", `files.remove:${fileId}`]);
});

it.each(["replace", "delete"] as const)(
  "keeps a committed %s successful when binary cleanup rejects",
  async (operation) => {
    const events: string[] = [];
    const existing = createVehicleDocument(
      { fileReference: managedFileIdFromUuidV7(fileId), name: "Invoice", vehicleId },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );
    if (!existing.ok) throw new Error("Invalid fixture");
    const repository = repositoryFake(events);
    repository.get = async () => repositorySuccess(existing.value);
    repository.delete = async () => repositorySuccess(existing.value);
    const files = managedFilesFake(events, replacementFileId);
    files.remove = jest.fn().mockRejectedValue(new Error("Native I/O failure"));
    const service = new VehicleDocumentService(
      { now: () => now },
      { generate: () => replacementFileId },
      repository,
      files,
    );
    const result =
      operation === "replace"
        ? await service.replace(existing.value, picked)
        : await service.delete(vehicleId, existing.value.id);
    expect(result.ok).toBe(true);
    expect(files.remove).toHaveBeenCalledTimes(1);
    expect(files.remove).toHaveBeenCalledWith(fileId);
  },
);

it("does not import a replacement for a document that was deleted after its screen loaded", async () => {
  const events: string[] = [];
  const existing = createVehicleDocument(
    { fileReference: managedFileIdFromUuidV7(fileId), name: "Invoice", vehicleId },
    { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
  );
  if (!existing.ok) throw new Error("Invalid fixture");
  const service = new VehicleDocumentService(
    { now: () => now },
    { generate: () => replacementFileId },
    repositoryFake(events),
    managedFilesFake(events),
  );
  expect(await service.replace(existing.value, picked)).toMatchObject({
    ok: false,
    error: { kind: "not-found" },
  });
  expect(events).toEqual([]);
});

it.each([0, maximumDocumentBytes + 1])(
  "keeps the existing attachment readable after rejecting %i bytes",
  async (size) => {
    const events: string[] = [];
    const existing = createVehicleDocument(
      { fileReference: managedFileIdFromUuidV7(fileId), name: "Invoice", vehicleId },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    );
    if (!existing.ok) throw new Error("Invalid fixture");
    const repository = repositoryFake(events);
    repository.get = async () => repositorySuccess(existing.value);
    const service = new VehicleDocumentService(
      { now: () => now },
      { generate: () => replacementFileId },
      repository,
      managedFilesFake(events),
    );
    expect(await service.replace(existing.value, { ...picked, size })).toMatchObject({
      ok: false,
      error: { kind: "unsupported", operation: "managedFile.import" },
    });
    expect(await service.getFile(existing.value)).toMatchObject({
      ok: true,
      value: { uri: `file:///managed/${fileId}` },
    });
    expect(events).toEqual([]);
  },
);

it("reports the stored owners when an older editor reassigns and deletes an attachment", async () => {
  const from = historyEntryIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d010");
  const to = historyEntryIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d011");
  const draft = expectValid(
    createVehicleDocument(
      {
        fileReference: managedFileIdFromUuidV7(fileId),
        historyEntryId: to,
        name: "Invoice",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator: { generate: () => documentId } },
    ),
  );
  let stored = { ...draft, historyEntryId: from };
  const repository = repositoryFake([]);
  repository.get = async () => repositorySuccess(stored);
  repository.update = async (value) => {
    stored = { ...value, historyEntryId: value.historyEntryId! };
    return repositorySuccess(undefined);
  };
  repository.delete = async () => repositorySuccess(stored);
  const service = new VehicleDocumentService(
    { now: () => now },
    { generate: () => fileId },
    repository,
    managedFilesFake([]),
  );
  expect(await service.update(draft, { name: draft.name, historyEntryId: to })).toMatchObject({
    ok: true,
    affectedHistoryEntryIds: [from, to],
  });
  expect(await service.delete(vehicleId, draft.id)).toMatchObject({
    ok: true,
    affectedHistoryEntryIds: [to],
  });
});
