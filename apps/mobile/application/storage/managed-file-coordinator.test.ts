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
import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestamp } from "@/domain/shared/value-objects";

import type { ManagedFileRepository } from "../repositories/managed-file-repository";
import { ManagedFileCoordinator } from "./managed-file-coordinator";

const id = managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f");
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
    expect(events).toEqual(["storage.discard", "storage.commit", "repository.markReady"]);
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
    getReady: async () => repositorySuccess(null),
    listRecoverable: async () => repositorySuccess([]),
    listUnreferencedVehiclePhotos: async () => repositorySuccess([]),
    markDeleting: async () => repositorySuccess(undefined),
    markReady: async () => {
      events.push("repository.markReady");
      return repositorySuccess(undefined);
    },
  };
}

function storageFake(events: string[]): ObjectStorage {
  const staged: StagedObject = { byteSize: size, managedFileId: id, sha256: hash, stagingKey };
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
