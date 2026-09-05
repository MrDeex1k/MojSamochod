import { CorruptStoredDataError } from "./row-mappers";
import { and, asc, desc, eq, ne, type SQL } from "drizzle-orm";

import type { VehicleDocumentRepository } from "@/application/repositories/vehicle-document-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import { documentDate, type VehicleDocument } from "@/domain/documents/vehicle-document";
import {
  documentIdFromUuidV7,
  historyEntryIdFromUuidV7,
  managedFileIdFromUuidV7,
  vehicleIdFromUuidV7,
  type DocumentId,
  type ManagedFileId,
  type VehicleId,
} from "@/domain/shared/identifiers";
import { money, optionalText, requiredText, utcTimestamp } from "@/domain/shared/value-objects";

import type { AppDatabase } from "./database";
import { historyEntries, managedFiles, vehicleDocuments, vehicles } from "./schema";

type VehicleDocumentRow = typeof vehicleDocuments.$inferSelect;
type DatabaseTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export class DrizzleVehicleDocumentRepository implements VehicleDocumentRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(document: VehicleDocument): Promise<RepositoryResult<void>> {
    const operation = "vehicleDocument.create";
    try {
      return this.database.transaction((transaction) => {
        const valid = validateRelations(transaction, document, operation);
        if (!valid.ok) return valid;
        const conflict = transaction
          .select({ id: vehicleDocuments.id })
          .from(vehicleDocuments)
          .where(
            // IDs and managed files are independently unique.
            eq(vehicleDocuments.id, document.id),
          )
          .limit(1)
          .get();
        const fileConflict = transaction
          .select({ id: vehicleDocuments.id })
          .from(vehicleDocuments)
          .where(eq(vehicleDocuments.fileReference, document.fileReference))
          .limit(1)
          .get();
        if (conflict || fileConflict) return repositoryFailure("conflict", operation);
        transaction.insert(vehicleDocuments).values(values(document)).run();
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }

  async delete(
    vehicleId: VehicleId,
    documentId: DocumentId,
  ): Promise<RepositoryResult<VehicleDocument>> {
    const operation = "vehicleDocument.delete";
    try {
      return this.database.transaction((transaction) => {
        const row = transaction
          .select()
          .from(vehicleDocuments)
          .where(
            and(eq(vehicleDocuments.vehicleId, vehicleId), eq(vehicleDocuments.id, documentId)),
          )
          .limit(1)
          .get();
        if (!row) return repositoryFailure("not-found", operation);
        transaction.delete(vehicleDocuments).where(eq(vehicleDocuments.id, documentId)).run();
        return repositorySuccess(mapRow(row));
      });
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }

  async get(
    vehicleId: VehicleId,
    documentId: DocumentId,
  ): Promise<RepositoryResult<VehicleDocument | null>> {
    return this.getWhere(
      and(eq(vehicleDocuments.vehicleId, vehicleId), eq(vehicleDocuments.id, documentId)),
      "vehicleDocument.get",
    );
  }

  async getByFile(fileReference: ManagedFileId): Promise<RepositoryResult<VehicleDocument | null>> {
    return this.getWhere(
      eq(vehicleDocuments.fileReference, fileReference),
      "vehicleDocument.getByFile",
    );
  }

  async list(vehicleId: VehicleId): Promise<RepositoryResult<readonly VehicleDocument[]>> {
    const operation = "vehicleDocument.list";
    try {
      return repositorySuccess(
        this.database
          .select()
          .from(vehicleDocuments)
          .where(eq(vehicleDocuments.vehicleId, vehicleId))
          .orderBy(
            desc(vehicleDocuments.documentDate),
            desc(vehicleDocuments.createdAt),
            asc(vehicleDocuments.id),
          )
          .all()
          .map(mapRow),
      );
    } catch (error) {
      return repositoryFailure(
        error instanceof CorruptStoredDataError ? "corrupt-data" : "unavailable",
        operation,
        error,
      );
    }
  }

  async update(document: VehicleDocument): Promise<RepositoryResult<void>> {
    const operation = "vehicleDocument.update";
    try {
      return this.database.transaction((transaction) => {
        const existing = transaction
          .select({ id: vehicleDocuments.id })
          .from(vehicleDocuments)
          .where(
            and(
              eq(vehicleDocuments.id, document.id),
              eq(vehicleDocuments.vehicleId, document.vehicleId),
            ),
          )
          .limit(1)
          .get();
        if (!existing) return repositoryFailure("not-found", operation);
        const valid = validateRelations(transaction, document, operation);
        if (!valid.ok) return valid;
        const fileConflict = transaction
          .select({ id: vehicleDocuments.id })
          .from(vehicleDocuments)
          .where(
            and(
              eq(vehicleDocuments.fileReference, document.fileReference),
              ne(vehicleDocuments.id, document.id),
            ),
          )
          .limit(1)
          .get();
        if (fileConflict) return repositoryFailure("conflict", operation);
        transaction
          .update(vehicleDocuments)
          .set(mutableValues(document))
          .where(eq(vehicleDocuments.id, document.id))
          .run();
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return repositoryFailure("unavailable", operation, error);
    }
  }

  private async getWhere(
    where: SQL | undefined,
    operation: string,
  ): Promise<RepositoryResult<VehicleDocument | null>> {
    try {
      const row = this.database.select().from(vehicleDocuments).where(where).limit(1).get();
      return repositorySuccess(row ? mapRow(row) : null);
    } catch (error) {
      return repositoryFailure(
        error instanceof CorruptStoredDataError ? "corrupt-data" : "unavailable",
        operation,
        error,
      );
    }
  }
}

function validateRelations(
  transaction: DatabaseTransaction,
  document: VehicleDocument,
  operation: string,
): RepositoryResult<void> {
  const vehicle = transaction
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.id, document.vehicleId))
    .limit(1)
    .get();
  const file = transaction
    .select({ id: managedFiles.id })
    .from(managedFiles)
    .where(
      and(
        eq(managedFiles.id, document.fileReference),
        eq(managedFiles.kind, "document"),
        eq(managedFiles.status, "ready"),
      ),
    )
    .limit(1)
    .get();
  if (!vehicle || !file) return repositoryFailure("not-found", operation);
  if (document.historyEntryId) {
    const entry = transaction
      .select({ id: historyEntries.id })
      .from(historyEntries)
      .where(
        and(
          eq(historyEntries.id, document.historyEntryId),
          eq(historyEntries.vehicleId, document.vehicleId),
        ),
      )
      .limit(1)
      .get();
    if (!entry) return repositoryFailure("not-found", operation);
  }
  return repositorySuccess(undefined);
}

function values(document: VehicleDocument) {
  return {
    createdAt: document.createdAt,
    id: document.id,
    vehicleId: document.vehicleId,
    ...mutableValues(document),
  };
}

function mutableValues(document: VehicleDocument) {
  return {
    amountCurrency: document.amount?.currency ?? null,
    amountMinorUnits: document.amount?.minorUnits ?? null,
    documentDate: document.documentDate ?? null,
    fileReference: document.fileReference,
    historyEntryId: document.historyEntryId ?? null,
    name: document.name,
    notes: document.notes ?? null,
    updatedAt: document.updatedAt,
  };
}

function mapRow(row: VehicleDocumentRow): VehicleDocument {
  try {
    return parseStoredRow(row);
  } catch {
    throw new CorruptStoredDataError("VehicleDocument");
  }
}

function parseStoredRow(row: VehicleDocumentRow): VehicleDocument {
  const hasAmount = row.amountMinorUnits !== null || row.amountCurrency !== null;
  if (hasAmount && (row.amountMinorUnits === null || row.amountCurrency === null)) {
    throw new Error("Stored document amount is incomplete");
  }
  return {
    amount: expect(
      money(
        hasAmount
          ? { currency: row.amountCurrency!, minorUnits: row.amountMinorUnits! }
          : undefined,
      ),
    ),
    createdAt: expect(utcTimestamp(row.createdAt, "createdAt")),
    documentDate: expect(documentDate(row.documentDate ?? undefined)),
    fileReference: managedFileIdFromUuidV7(row.fileReference),
    historyEntryId: row.historyEntryId ? historyEntryIdFromUuidV7(row.historyEntryId) : undefined,
    id: documentIdFromUuidV7(row.id),
    name: expect(requiredText(row.name, "name", 255)),
    notes: expect(optionalText(row.notes ?? undefined, "notes", 5000)),
    updatedAt: expect(utcTimestamp(row.updatedAt, "updatedAt")),
    vehicleId: vehicleIdFromUuidV7(row.vehicleId),
  };
}

function expect<T>(result: { ok: false } | { ok: true; value: T }): T {
  if (!result.ok) throw new Error("Stored document violates the domain contract");
  return result.value;
}
