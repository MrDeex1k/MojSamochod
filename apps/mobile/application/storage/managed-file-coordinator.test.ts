import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import {
  objectStorageFailure,
  objectStorageSuccess,
  type ObjectStorage,
  type StagedObject,
  type StagedObjectKey,
} from "@/application/storage/object-storage";
import {
  byteSize,
  sha256Digest,
  storageObjectKey,
  type StagedManagedFileMetadata,
} from "@/domain/files/managed-file";
import { managedFileIdFromUuidV7, type ManagedFileId } from "@/domain/shared/identifiers";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestamp } from "@/domain/shared/value-objects";

import type { ManagedFileRepository } from "../repositories/managed-file-repository";
import { ManagedFileCoordinator } from "./managed-file-coordinator";

const id = managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f");
const secondId = managedFileIdFromUuidV7("018f47e2-7b32-7658-b336-34613389d00f");
const timestamp = expectValid(utcTimestamp("2026-08-30T10:15:00.000Z", "timestamp"));
const size = expectValid(byteSize(3));
const hash = expectValid(sha256Digest("ab".repeat(32)));
const stagingKey = `staging/${id}.jpg` as StagedObjectKey;
const storedKey = expectValid(storageObjectKey(`objects/${id}.jpg`));
const clock: Clock = { now: () => new Date(timestamp) };

describe("ManagedFileCoordinator", () => {
  it("imports a photo through staged metadata before marking it ready", async () => {
    const events: string[] = [];
    const repository = repositoryFake(events);
    const storage = storageFake(events);

    const result = await new ManagedFileCoordinator(clock, repository, storage).import({
      kind: "vehicle-photo",
      managedFileId: id,
      mimeType: "image/jpeg",
      originalName: "car.jpg",
      sourceUri: "file:///car.jpg",
    });

    expect(result).toMatchObject({ ok: true, value: { id, status: "ready" } });
    expect(events).toEqual([
      "storage.stage",
      "repository.createStaged",
      "storage.commit",
      "repository.markReady",
    ]);
  });

  it("discards the staged copy when metadata cannot be created", async () => {
    const events: string[] = [];
    const repository = repositoryFake(events);
    repository.createStaged = async () => repositoryFailure("unavailable", "test");
    const storage = storageFake(events);

    const result = await new ManagedFileCoordinator(clock, repository, storage).import({
      kind: "vehicle-photo",
      managedFileId: id,
      mimeType: "image/jpeg",
      originalName: "car.jpg",
      sourceUri: "file:///car.jpg",
    });

    expect(result).toMatchObject({ error: { kind: "unavailable" }, ok: false });
    expect(events).toContain("storage.discard");
  });

  it("keeps one ready record when identical documents are imported concurrently", async () => {
    const records = new Map<
      ManagedFileId,
      Readonly<{ sha256: StagedManagedFileMetadata["sha256"]; status: "ready" | "staged" }>
    >();
    const discarded: string[] = [];
    const repository = repositoryFake([]);
    repository.findReadyBySha256 = async () => repositorySuccess(null);
    repository.createStaged = async (metadata) => {
      if ([...records.values()].some((record) => record.sha256 === metadata.sha256)) {
        return repositoryFailure("conflict", "managedFile.createStaged");
      }
      records.set(metadata.id, { sha256: metadata.sha256, status: "staged" });
      return repositorySuccess(undefined);
    };
    repository.markReady = async (managedFileId) => {
      const record = records.get(managedFileId);
      if (!record) return repositoryFailure("not-found", "managedFile.markReady");
      records.set(managedFileId, { ...record, status: "ready" });
      return repositorySuccess(undefined);
    };
    const storage = storageFake([]);
    storage.stage = async (input) =>
      objectStorageSuccess({
        byteSize: size,
        extension: "pdf",
        managedFileId: input.managedFileId,
        sha256: hash,
        stagingKey: `staging/${input.managedFileId}.pdf` as StagedObjectKey,
      });
    storage.commit = async (staged) =>
      objectStorageSuccess({
        ...staged,
        storageKey: expectValid(storageObjectKey(`objects/${staged.managedFileId}.pdf`)),
      });
    storage.discard = async (key) => {
      discarded.push(key);
      return objectStorageSuccess(undefined);
    };
    const coordinator = new ManagedFileCoordinator(clock, repository, storage);

    const results = await Promise.all(
      [id, secondId].map((managedFileId) =>
        coordinator.import({
          kind: "document",
          managedFileId,
          mimeType: "application/pdf",
          originalName: "invoice.pdf",
          sourceUri: "file:///invoice.pdf",
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok && result.error.kind === "conflict")).toHaveLength(
      1,
    );
    expect([...records.values()].filter((record) => record.status === "ready")).toHaveLength(1);
    expect(discarded).toHaveLength(1);
  });

  it("reconciles tracked copies and removes untracked staging files", async () => {
    const events: string[] = [];
    const repository = repositoryFake(events);
    const stagedMetadata: StagedManagedFileMetadata = {
      byteSize: size,
      createdAt: timestamp,
      id,
      kind: "vehicle-photo",
      mimeType: "image/jpeg",
      originalName: "car.jpg",
      sha256: hash,
      stagingKey,
      status: "staged",
      updatedAt: timestamp,
    };
    repository.listRecoverable = async () => repositorySuccess([stagedMetadata]);
    const storage = storageFake(events);
    storage.listStagedKeys = async () =>
      objectStorageSuccess([stagingKey, "staging/orphan.jpg" as StagedObjectKey]);

    await expect(
      new ManagedFileCoordinator(clock, repository, storage).reconcile(),
    ).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(events).toEqual(["storage.commit", "repository.markReady", "storage.discard"]);
  });

  it("exposes recovered data before cleanup and never scans newly imported files", async () => {
    const events: string[] = [];
    const repository = repositoryFake(events);
    const storage = storageFake(events);
    storage.listStagedKeys = async () =>
      objectStorageSuccess(["staging/orphan.jpg" as StagedObjectKey]);
    storage.discard = async () => {
      events.push("cleanup");
      return objectStorageFailure("unavailable", "test");
    };
    repository.listUnreferencedReadyFiles = async () => {
      events.push("snapshot");
      return repositorySuccess([]);
    };
    const result = await new ManagedFileCoordinator(clock, repository, storage).reconcile(() =>
      events.push("ready"),
    );
    expect(events).toEqual(["snapshot", "ready", "cleanup"]);
    expect(result).toMatchObject({ ok: false });
  });

  it("removes stale metadata when its staged copy disappeared", async () => {
    const events: string[] = [];
    const repository = repositoryFake(events);
    repository.listRecoverable = async () =>
      repositorySuccess([
        {
          byteSize: size,
          createdAt: timestamp,
          id,
          kind: "vehicle-photo",
          mimeType: "image/jpeg",
          originalName: "car.jpg",
          sha256: hash,
          stagingKey,
          status: "staged",
          updatedAt: timestamp,
        },
      ]);
    const storage = storageFake(events);
    storage.commit = async () => objectStorageFailure("not-found", "test");

    await expect(
      new ManagedFileCoordinator(clock, repository, storage).reconcile(),
    ).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(events).toContain("repository.delete");
  });
});

function repositoryFake(events: string[]): ManagedFileRepository {
  return {
    createStaged: async () => {
      events.push("repository.createStaged");
      return repositorySuccess(undefined);
    },
    delete: async () => {
      events.push("repository.delete");
      return repositorySuccess(undefined);
    },
    findReadyBySha256: async () => repositorySuccess(null),
    getReady: async () => repositorySuccess(null),
    listRecoverable: async () => repositorySuccess([]),
    listUnreferencedReadyFiles: async () => repositorySuccess([]),
    markDeleting: async () => repositorySuccess(undefined),
    markReady: async () => {
      events.push("repository.markReady");
      return repositorySuccess(undefined);
    },
  };
}

function storageFake(events: string[]): ObjectStorage {
  const staged: StagedObject = {
    byteSize: size,
    extension: "jpg",
    managedFileId: id,
    sha256: hash,
    stagingKey,
  };
  return {
    commit: async () => {
      events.push("storage.commit");
      return objectStorageSuccess({ ...staged, storageKey: storedKey });
    },
    copyTo: async () => objectStorageSuccess(undefined),
    delete: async () => objectStorageSuccess(undefined),
    discard: async () => {
      events.push("storage.discard");
      return objectStorageSuccess(undefined);
    },
    listStagedKeys: async () => objectStorageSuccess([]),
    getUri: () => objectStorageSuccess("file:///managed/photo.jpg"),
    stage: async () => {
      events.push("storage.stage");
      return objectStorageSuccess(staged);
    },
  };
}

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected valid test value");
  return result.value;
}
