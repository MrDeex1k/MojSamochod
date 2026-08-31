import {
  byteSize,
  sha256Digest,
  type StagedManagedFileMetadata,
} from "@/domain/files/managed-file";
import { managedFileIdFromUuidV7 } from "@/domain/shared/identifiers";
import { utcTimestamp } from "@/domain/shared/value-objects";

import type { AppDatabase } from "./database";
import { DrizzleManagedFileRepository } from "./drizzle-managed-file-repository";

const metadata: StagedManagedFileMetadata = {
  byteSize: expectValid(byteSize(3)),
  createdAt: expectValid(utcTimestamp("2026-08-31T08:00:00.000Z", "createdAt")),
  id: managedFileIdFromUuidV7("018f47e2-7b31-7658-b336-34613389d00f"),
  kind: "document",
  mimeType: "application/pdf",
  originalName: "invoice.pdf",
  sha256: expectValid(sha256Digest("ab".repeat(32))),
  stagingKey: "staging/018f47e2-7b31-7658-b336-34613389d00f.pdf",
  status: "staged",
  updatedAt: expectValid(utcTimestamp("2026-08-31T08:00:00.000Z", "updatedAt")),
};

describe("DrizzleManagedFileRepository", () => {
  it("maps a unique reservation collision to conflict", async () => {
    const constraint = Object.assign(new Error("UNIQUE constraint failed: managed_files.sha256"), {
      code: "SQLITE_CONSTRAINT_UNIQUE",
    });
    const database = {
      insert: jest.fn(() => ({
        values: () => ({
          run: () => {
            throw constraint;
          },
        }),
      })),
    } as unknown as AppDatabase;

    await expect(
      new DrizzleManagedFileRepository(database).createStaged(metadata),
    ).resolves.toMatchObject({
      error: { cause: constraint, kind: "conflict", operation: "managedFile.createStaged" },
      ok: false,
    });
  });

  it("keeps unrelated database failures unavailable", async () => {
    const database = {
      insert: jest.fn(() => ({
        values: () => ({
          run: () => {
            throw new Error("Database closed");
          },
        }),
      })),
    } as unknown as AppDatabase;

    await expect(
      new DrizzleManagedFileRepository(database).createStaged(metadata),
    ).resolves.toMatchObject({ error: { kind: "unavailable" }, ok: false });
  });
});

function expectValid<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Expected a valid fixture");
  return result.value;
}
