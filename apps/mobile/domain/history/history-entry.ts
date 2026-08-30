import {
  historyEntryIdFromUuidV7,
  type HistoryEntryId,
  type VehicleId,
} from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import {
  metres,
  money,
  optionalText,
  requiredText,
  utcTimestamp,
  utcTimestampFromDate,
  type Metres,
  type Money,
  type MoneyInput,
  type UtcTimestamp,
} from "../shared/value-objects";

type HistoryEntryCommon = Readonly<{
  cost?: Money;
  createdAt: UtcTimestamp;
  id: HistoryEntryId;
  notes?: string;
  occurredAt: UtcTimestamp;
  odometerMetres?: Metres;
  serviceProvider?: string;
  updatedAt: UtcTimestamp;
  vehicleId: VehicleId;
}>;

export type InspectionEntry = HistoryEntryCommon &
  Readonly<{
    details: Readonly<{
      description?: string;
      kind: "technical" | "diagnostic" | "other";
      result: "passed" | "failed" | "conditional" | "not-recorded";
    }>;
    type: "inspection";
  }>;

export type ReplacementEntry = HistoryEntryCommon &
  Readonly<{
    details: Readonly<{
      item: string;
      manufacturer?: string;
      partNumber?: string;
    }>;
    type: "replacement";
  }>;

export type RepairEntry = HistoryEntryCommon &
  Readonly<{
    details: Readonly<{
      description?: string;
      subject: string;
    }>;
    type: "repair";
  }>;

export type HistoryEntry = InspectionEntry | ReplacementEntry | RepairEntry;

type HistoryEntryInputCommon = Readonly<{
  cost?: MoneyInput;
  notes?: string;
  occurredAt: string;
  odometerMetres?: number;
  serviceProvider?: string;
  vehicleId: VehicleId;
}>;

export type CreateHistoryEntryInput =
  | (HistoryEntryInputCommon &
      Readonly<{
        details: Readonly<{ description?: string; kind: string; result: string }>;
        type: "inspection";
      }>)
  | (HistoryEntryInputCommon &
      Readonly<{
        details: Readonly<{ item: string; manufacturer?: string; partNumber?: string }>;
        type: "replacement";
      }>)
  | (HistoryEntryInputCommon &
      Readonly<{
        details: Readonly<{ description?: string; subject: string }>;
        type: "repair";
      }>);

export type CreateHistoryEntryDependencies = Readonly<{
  clock: Clock;
  idGenerator: IdGenerator;
}>;

export function createHistoryEntry(
  input: CreateHistoryEntryInput,
  dependencies: CreateHistoryEntryDependencies,
): ValidationResult<HistoryEntry> {
  const now = dependencies.clock.now();
  const issues: ValidationIssue[] = [];
  const occurredAt = collect(utcTimestamp(input.occurredAt, "occurredAt"), issues);
  const odometerMetres = collect(metres(input.odometerMetres, "odometerMetres"), issues);
  const cost = collect(money(input.cost), issues);
  const serviceProvider = collect(
    optionalText(input.serviceProvider, "serviceProvider", 120),
    issues,
  );
  const notes = collect(optionalText(input.notes, "notes", 5000), issues);
  const details = validateDetails(input, issues);

  if (occurredAt && Date.parse(occurredAt) > now.getTime()) {
    issues.push({ code: "future", field: "occurredAt" });
  }

  if (issues.length > 0 || !details) {
    return invalid(issues);
  }

  const timestamp = utcTimestampFromDate(now);
  const common = {
    cost,
    createdAt: timestamp,
    id: historyEntryIdFromUuidV7(dependencies.idGenerator.generate()),
    notes,
    occurredAt: occurredAt!,
    odometerMetres,
    serviceProvider,
    updatedAt: timestamp,
    vehicleId: input.vehicleId,
  };

  switch (input.type) {
    case "inspection":
      return valid({ ...common, details: details as InspectionEntry["details"], type: input.type });
    case "replacement":
      return valid({
        ...common,
        details: details as ReplacementEntry["details"],
        type: input.type,
      });
    case "repair":
      return valid({ ...common, details: details as RepairEntry["details"], type: input.type });
  }
}

export function updateHistoryEntry(
  existing: HistoryEntry,
  input: CreateHistoryEntryInput,
  clock: Clock,
): ValidationResult<HistoryEntry> {
  if (input.type !== existing.type) {
    return invalid([{ code: "invalid-format", field: "type" }]);
  }

  const validated = createHistoryEntry(input, {
    clock,
    idGenerator: { generate: () => existing.id },
  });
  return validated.ok
    ? valid({ ...validated.value, createdAt: existing.createdAt, id: existing.id })
    : validated;
}

export function compareHistoryEntriesNewestFirst(left: HistoryEntry, right: HistoryEntry): number {
  return (
    right.occurredAt.localeCompare(left.occurredAt) ||
    right.createdAt.localeCompare(left.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

export function advancedCurrentOdometer(
  current: Metres | undefined,
  entry: Metres | undefined,
): Metres | undefined {
  if (entry === undefined || (current !== undefined && entry <= current)) {
    return current;
  }

  return entry;
}

function collect<T>(result: ValidationResult<T>, issues: ValidationIssue[]): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }

  return result.value;
}

function validateDetails(
  input: CreateHistoryEntryInput,
  issues: ValidationIssue[],
): HistoryEntry["details"] | undefined {
  switch (input.type) {
    case "inspection":
      return validateInspectionDetails(input.details, issues);
    case "replacement":
      return validateReplacementDetails(input.details, issues);
    case "repair":
      return validateRepairDetails(input.details, issues);
  }
}

function validateInspectionDetails(
  details: Extract<CreateHistoryEntryInput, { type: "inspection" }>["details"],
  issues: ValidationIssue[],
): InspectionEntry["details"] | undefined {
  const description = collect(
    optionalText(details.description, "details.description", 200),
    issues,
  );
  const validKind = ["technical", "diagnostic", "other"].includes(details.kind);
  const validResult = ["passed", "failed", "conditional", "not-recorded"].includes(details.result);

  if (!validKind) {
    issues.push({ code: "invalid-format", field: "details.kind" });
  }
  if (!validResult) {
    issues.push({ code: "invalid-format", field: "details.result" });
  }

  if (!validKind || !validResult) {
    return undefined;
  }

  return {
    description,
    kind: details.kind as InspectionEntry["details"]["kind"],
    result: details.result as InspectionEntry["details"]["result"],
  };
}

function validateReplacementDetails(
  details: Extract<CreateHistoryEntryInput, { type: "replacement" }>["details"],
  issues: ValidationIssue[],
): ReplacementEntry["details"] | undefined {
  const item = collect(requiredText(details.item, "details.item", 120), issues);
  const manufacturer = collect(
    optionalText(details.manufacturer, "details.manufacturer", 100),
    issues,
  );
  const partNumber = collect(optionalText(details.partNumber, "details.partNumber", 100), issues);

  return item ? { item, manufacturer, partNumber } : undefined;
}

function validateRepairDetails(
  details: Extract<CreateHistoryEntryInput, { type: "repair" }>["details"],
  issues: ValidationIssue[],
): RepairEntry["details"] | undefined {
  const subject = collect(requiredText(details.subject, "details.subject", 120), issues);
  const description = collect(
    optionalText(details.description, "details.description", 500),
    issues,
  );

  return subject ? { description, subject } : undefined;
}
