import { countCharacters, metres, money, optionalText, utcTimestamp } from "./value-objects";

describe("domain value objects", () => {
  it("counts Unicode code points instead of UTF-16 code units", () => {
    expect(countCharacters("A🚗B")).toBe(3);
  });

  it("distinguishes zero money from a missing value", () => {
    expect(money(undefined)).toEqual({ ok: true, value: undefined });
    expect(money({ currency: "EUR", minorUnits: 0 })).toEqual({
      ok: true,
      value: { currency: "EUR", minorUnits: 0 },
    });
  });

  it("rejects unsafe integer distances and amounts", () => {
    expect(metres(Number.MAX_SAFE_INTEGER + 1, "odometer")).toEqual({
      issues: [{ code: "out-of-range", field: "odometer" }],
      ok: false,
    });
    expect(money({ currency: "EUR", minorUnits: Number.MAX_SAFE_INTEGER + 1 })).toEqual({
      issues: [{ code: "out-of-range", field: "cost.minorUnits" }],
      ok: false,
    });
  });

  it("preserves internal whitespace while trimming text boundaries", () => {
    expect(optionalText("  first\n  second  ", "notes", 100)).toEqual({
      ok: true,
      value: "first\n  second",
    });
  });

  it("accepts only canonical UTC ISO timestamps", () => {
    expect(utcTimestamp("2026-08-30T14:30:00.000Z", "occurredAt").ok).toBe(true);
    expect(utcTimestamp("2026-08-30T16:30:00.000+02:00", "occurredAt")).toEqual({
      issues: [{ code: "invalid-format", field: "occurredAt" }],
      ok: false,
    });
  });
});
