import {
  documentIdFromUuidV7,
  type DocumentId,
  type HistoryEntryId,
  type ManagedFileId,
  type VehicleId,
} from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import {
  money,
  optionalText,
  requiredText,
  utcTimestampFromDate,
  type Money,
  type MoneyInput,
  type UtcTimestamp,
} from "../shared/value-objects";

declare const documentDateBrand: unique symbol;

export type DocumentDate = string & { readonly [documentDateBrand]: true };

export type VehicleDocument = Readonly<{
  amount?: Money;
  createdAt: UtcTimestamp;
  documentDate?: DocumentDate;
  fileReference: ManagedFileId;
  historyEntryId?: HistoryEntryId;
  id: DocumentId;
  name: string;
  notes?: string;
  updatedAt: UtcTimestamp;
  vehicleId: VehicleId;
}>;

export type VehicleDocumentInput = Readonly<{
  amount?: MoneyInput;
  documentDate?: string;
  fileReference: ManagedFileId;
  historyEntryId?: HistoryEntryId;
  name: string;
  notes?: string;
  vehicleId: VehicleId;
}>;

export function createVehicleDocument(
  input: VehicleDocumentInput,
  dependencies: Readonly<{ clock: Clock; idGenerator: IdGenerator }>,
): ValidationResult<VehicleDocument> {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const timestamp = utcTimestampFromDate(dependencies.clock.now());
  return valid({
    ...validated.value,
    createdAt: timestamp,
    id: documentIdFromUuidV7(dependencies.idGenerator.generate()),
    updatedAt: timestamp,
  });
}

export function updateVehicleDocument(
  existing: VehicleDocument,
  input: VehicleDocumentInput,
  clock: Clock,
): ValidationResult<VehicleDocument> {
  const validated = validateInput(input);
  return validated.ok
    ? valid({
        ...validated.value,
        createdAt: existing.createdAt,
        id: existing.id,
        updatedAt: utcTimestampFromDate(clock.now()),
      })
    : validated;
}

export function documentDate(
  value: string | undefined,
): ValidationResult<DocumentDate | undefined> {
  const normalized = value?.trim();
  if (!normalized) return valid(undefined);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return invalid([{ code: "invalid-format", field: "documentDate" }]);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(normalized)
    ? valid(normalized as DocumentDate)
    : invalid([{ code: "invalid-format", field: "documentDate" }]);
}

function validateInput(
  input: VehicleDocumentInput,
): ValidationResult<Omit<VehicleDocument, "createdAt" | "id" | "updatedAt">> {
  const issues: ValidationIssue[] = [];
  const name = collect(requiredText(input.name, "name", 255), issues);
  const date = collect(documentDate(input.documentDate), issues);
  const amount = collect(money(input.amount, "amount"), issues);
  const notes = collect(optionalText(input.notes, "notes", 5000), issues);
  return issues.length > 0
    ? invalid(issues)
    : valid({
        amount,
        documentDate: date,
        fileReference: input.fileReference,
        historyEntryId: input.historyEntryId,
        name: name!,
        notes,
        vehicleId: input.vehicleId,
      });
}

function collect<T>(result: ValidationResult<T>, issues: ValidationIssue[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}
