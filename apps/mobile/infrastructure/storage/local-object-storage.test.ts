const mockDigest = jest.fn();

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: (...arguments_: unknown[]) => mockDigest(...arguments_),
}));

import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";

import {
  LocalObjectStorage,
  maximumVehiclePhotoBytes,
  type ObjectStorageDriver,
} from "./local-object-storage";

const managedFileId = managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f");

describe("LocalObjectStorage", () => {
  beforeEach(() => {
    mockDigest.mockResolvedValue(new Uint8Array(32).fill(0xab).buffer);
  });

  it("stages a private copy with deterministic integrity metadata", async () => {
    const driver = new MemoryDriver(new Uint8Array([1, 2, 3]));
    const storage = new LocalObjectStorage(driver);

    const result = await storage.stage({
      extension: "jpg",
      managedFileId,
      maximumBytes: maximumVehiclePhotoBytes,
      sourceUri: "file:///selected.jpg",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        byteSize: 3,
        extension: "jpg",
        managedFileId,
        sha256: "ab".repeat(32),
        stagingKey: `staging/${managedFileId}.jpg`,
      },
    });
    expect(driver.copiedSources).toEqual(["file:///selected.jpg"]);
  });

  it("removes a staged photo that exceeds the final size limit", async () => {
    const driver = new MemoryDriver(new Uint8Array(maximumVehiclePhotoBytes + 1));
    const storage = new LocalObjectStorage(driver);

    const result = await storage.stage({
      extension: "jpg",
      managedFileId,
      maximumBytes: maximumVehiclePhotoBytes,
      sourceUri: "file:///large.jpg",
    });

    expect(result).toMatchObject({ error: { kind: "invalid-source" }, ok: false });
    expect(driver.files.size).toBe(0);
    expect(driver.readCalls).toBe(0);
  });

  it("commits idempotently and treats repeated deletion as success", async () => {
    const driver = new MemoryDriver(new Uint8Array([1]));
    const storage = new LocalObjectStorage(driver);
    const staged = await storage.stage({
      extension: "jpg",
      managedFileId,
      maximumBytes: maximumVehiclePhotoBytes,
      sourceUri: "file:///selected.jpg",
    });
    if (!staged.ok) throw new Error("Expected staged object");

    const first = await storage.commit(staged.value);
    const second = await storage.commit(staged.value);
    if (!first.ok) throw new Error("Expected stored object");

    expect(second).toEqual(first);
    await expect(storage.delete(first.value.storageKey)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    await expect(storage.delete(first.value.storageKey)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("resolves a committed photo after the storage service is recreated", async () => {
    const driver = new MemoryDriver(new Uint8Array([1, 2, 3]));
    const firstStorage = new LocalObjectStorage(driver);
    const staged = await firstStorage.stage({
      extension: "jpg",
      managedFileId,
      maximumBytes: maximumVehiclePhotoBytes,
      sourceUri: "file:///selected.jpg",
    });
    if (!staged.ok) throw new Error("Expected staged object");
    const committed = await firstStorage.commit(staged.value);
    if (!committed.ok) throw new Error("Expected committed object");

    const reopenedStorage = new LocalObjectStorage(driver);

    expect(reopenedStorage.getUri(committed.value.storageKey)).toEqual({
      ok: true,
      value: `file:///managed-objects/objects/${managedFileId}.jpg`,
    });
  });
});

class MemoryDriver implements ObjectStorageDriver {
  readonly copiedSources: string[] = [];
  readonly files = new Map<string, Uint8Array<ArrayBuffer>>();
  readCalls = 0;

  constructor(private readonly source: Uint8Array<ArrayBuffer>) {}

  async copyFrom(sourceUri: string, key: string): Promise<void> {
    this.copiedSources.push(sourceUri);
    this.files.set(key, this.source);
  }

  async copyTo(): Promise<void> {}

  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }

  exists(key: string): boolean {
    return this.files.has(key);
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const value = this.files.get(fromKey);
    if (!value) throw new Error("Missing source");
    this.files.set(toKey, value);
    this.files.delete(fromKey);
  }

  list(prefix: string): readonly string[] {
    const directory = `${prefix}/`;
    return [...this.files.keys()]
      .filter((key) => key.startsWith(directory))
      .map((key) => key.slice(directory.length));
  }

  async read(key: string): Promise<Uint8Array<ArrayBuffer>> {
    this.readCalls += 1;
    const value = this.files.get(key);
    if (!value) throw new Error("Missing file");
    return value;
  }

  size(key: string): number {
    return this.files.get(key)?.byteLength ?? 0;
  }

  uri(key: string): string {
    return `file:///managed-objects/${key}`;
  }
}
