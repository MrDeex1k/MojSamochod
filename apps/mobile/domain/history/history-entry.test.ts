import { historyEntryIdFromUuidV7, vehicleIdFromUuidV7 } from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { metres, utcTimestampFromDate } from "../shared/value-objects";
import {
  advancedCurrentOdometer,
  compareHistoryEntriesNewestFirst,
  createHistoryEntry,
  updateHistoryEntry,
  type CreateHistoryEntryInput,
  type HistoryEntry,
} from "./history-entry";

const now = new Date("2026-08-30T14:30:00.000Z");
const vehicleId = vehicleIdFromUuidV7("01941f29-7c00-73e4-a310-744d2167fc5b");
const generatedId = "01941f29-7c00-73e5-a310-744d2167fc5b";

function dependencies(): { clock: Clock; idGenerator: IdGenerator } {
  return {
    clock: { now: () => now },
    idGenerator: { generate: () => generatedId },
  };
}

describe("createHistoryEntry", () => {
  it.each([
    [
      "inspection",
      { description: " Annual check ", kind: "technical", result: "passed" },
      { description: "Annual check", kind: "technical", result: "passed" },
    ],
    [
      "replacement",
      { item: " Engine oil ", manufacturer: " Volvo ", partNumber: " 123 " },
      { item: "Engine oil", manufacturer: "Volvo", partNumber: "123" },
    ],
    [
      "repair",
      { description: " Replaced damaged hose ", subject: " Cooling system " },
      { description: "Replaced damaged hose", subject: "Cooling system" },
    ],
  ] as const)("creates and normalizes a valid %s entry", (type, details, expectedDetails) => {
    const result = createHistoryEntry(
      {
        cost: { currency: "PLN", minorUnits: 0 },
        details,
        notes: "  Customer note  ",
        occurredAt: "2026-08-29T12:00:00.000Z",
        odometerMetres: 100_000,
        serviceProvider: "  Workshop  ",
        type,
        vehicleId,
      } as CreateHistoryEntryInput,
      dependencies(),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        cost: { currency: "PLN", minorUnits: 0 },
        createdAt: "2026-08-30T14:30:00.000Z",
        details: expectedDetails,
        id: generatedId,
        notes: "Customer note",
        occurredAt: "2026-08-29T12:00:00.000Z",
        odometerMetres: 100_000,
        serviceProvider: "Workshop",
        type,
        updatedAt: "2026-08-30T14:30:00.000Z",
        vehicleId,
      });
    }
  });

  it("rejects future and non-canonical timestamps without consuming an id", () => {
    const idGenerator = { generate: jest.fn(() => generatedId) };
    const future = createHistoryEntry(
      {
        details: { description: "", subject: "Brakes" },
        occurredAt: "2026-08-30T14:31:00.000Z",
        type: "repair",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator },
    );
    const nonCanonical = createHistoryEntry(
      {
        details: { description: "", subject: "Brakes" },
        occurredAt: "2026-08-30T14:00:00Z",
        type: "repair",
        vehicleId,
      },
      { clock: { now: () => now }, idGenerator },
    );

    expect(future).toEqual({ issues: [{ code: "future", field: "occurredAt" }], ok: false });
    expect(nonCanonical).toEqual({
      issues: [{ code: "invalid-format", field: "occurredAt" }],
      ok: false,
    });
    expect(idGenerator.generate).not.toHaveBeenCalled();
  });

  it("validates money, distance, common text, and type-specific details", () => {
    const result = createHistoryEntry(
      {
        cost: { currency: "pln", minorUnits: 1.5 },
        details: { item: " " },
        occurredAt: "2026-08-29T12:00:00.000Z",
        odometerMetres: -1,
        serviceProvider: "x".repeat(121),
        type: "replacement",
        vehicleId,
      },
      dependencies(),
    );

    expect(result).toEqual({
      issues: [
        { code: "out-of-range", field: "odometerMetres" },
        { code: "out-of-range", field: "cost.minorUnits" },
        { code: "invalid-format", field: "cost.currency" },
        { code: "too-long", field: "serviceProvider" },
        { code: "required", field: "details.item" },
      ],
      ok: false,
    });
  });

  it("rejects details that do not belong to the selected entry type", () => {
    const result = createHistoryEntry(
      {
        details: { subject: "Brakes" },
        occurredAt: "2026-08-29T12:00:00.000Z",
        type: "inspection",
        vehicleId,
      } as unknown as CreateHistoryEntryInput,
      dependencies(),
    );

    expect(result).toEqual({
      issues: [
        { code: "invalid-format", field: "details.kind" },
        { code: "invalid-format", field: "details.result" },
      ],
      ok: false,
    });
  });
});

describe("history rules", () => {
  it("updates editable values while preserving identity, creation time, and type", () => {
    const existing = historyEntry(generatedId, "2026-08-29T12:00:00.000Z");
    const result = updateHistoryEntry(
      existing,
      {
        details: { subject: "Updated repair" },
        occurredAt: "2026-08-30T12:00:00.000Z",
        type: "repair",
        vehicleId,
      },
      dependencies().clock,
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        createdAt: existing.createdAt,
        id: existing.id,
        type: existing.type,
        updatedAt: now.toISOString(),
      },
    });
  });

  it("advances only an unknown or lower current odometer", () => {
    const lower = metres(100, "odometer");
    const higher = metres(200, "odometer");
    expect(lower.ok && higher.ok).toBe(true);
    if (lower.ok && higher.ok) {
      expect(advancedCurrentOdometer(undefined, lower.value)).toBe(100);
      expect(advancedCurrentOdometer(higher.value, lower.value)).toBe(200);
      expect(advancedCurrentOdometer(lower.value, higher.value)).toBe(200);
    }
  });

  it("sorts by occurredAt, createdAt, and finally id", () => {
    const entries = [
      historyEntry("01941f29-7c00-73e7-a310-744d2167fc5b", "2026-08-29T12:00:00.000Z"),
      historyEntry("01941f29-7c00-73e6-a310-744d2167fc5b", "2026-08-30T12:00:00.000Z"),
      historyEntry("01941f29-7c00-73e5-a310-744d2167fc5b", "2026-08-30T12:00:00.000Z"),
    ];

    expect(entries.sort(compareHistoryEntriesNewestFirst).map((entry) => entry.id)).toEqual([
      "01941f29-7c00-73e5-a310-744d2167fc5b",
      "01941f29-7c00-73e6-a310-744d2167fc5b",
      "01941f29-7c00-73e7-a310-744d2167fc5b",
    ]);
  });
});

function historyEntry(id: string, occurredAt: string): HistoryEntry {
  const timestamp = utcTimestampFromDate(new Date("2026-08-30T13:00:00.000Z"));
  return {
    createdAt: timestamp,
    details: { description: undefined, subject: "Subject" },
    id: historyEntryIdFromUuidV7(id),
    occurredAt: utcTimestampFromDate(new Date(occurredAt)),
    type: "repair",
    updatedAt: timestamp,
    vehicleId,
  };
}
