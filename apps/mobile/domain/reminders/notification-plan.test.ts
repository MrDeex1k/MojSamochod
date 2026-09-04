import { vehicleIdFromUuidV7 } from "../shared/identifiers";
import { planReminderNotifications } from "./notification-plan";
import { createReminder, updateReminder, type Reminder } from "./reminder";

const vehicleId = vehicleIdFromUuidV7("01941f29-7c00-73e4-a310-744d2167fc5b");
const dependencies = {
  clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
  idGenerator: { generate: () => "01941f29-7c00-73e5-a310-744d2167fc5b" },
};

function reminder(dueDate = "2026-03-30", timeZone = "Europe/Warsaw"): Reminder {
  const result = createReminder({ dueDate, kind: "insurance", timeZone, vehicleId }, dependencies);
  if (!result.ok) throw new Error("Invalid fixture");
  return result.value;
}

function times(record: Reminder, now = "2026-01-01T00:00:00.000Z"): string[] {
  const result = planReminderNotifications(record, new Date(now));
  if (!result.ok) throw new Error("Invalid schedule");
  return result.value.map((notification) => notification.fireAt);
}

describe("Reminder notification plan", () => {
  it("calculates spring offsets as calendar days at 09:00, not multiples of 24 hours", () => {
    expect(times(reminder())).toEqual([
      "2026-03-23T08:00:00.000Z",
      "2026-03-29T07:00:00.000Z",
      "2026-03-30T07:00:00.000Z",
    ]);
  });
  it("keeps 09:00 across the autumn clock change", () => {
    expect(times(reminder("2026-10-26"))).toEqual([
      "2026-10-19T07:00:00.000Z",
      "2026-10-25T08:00:00.000Z",
      "2026-10-26T08:00:00.000Z",
    ]);
  });
  it.each([
    ["Asia/Kathmandu", "2026-06-10T03:15:00.000Z"],
    ["America/New_York", "2026-06-10T13:00:00.000Z"],
    ["Pacific/Kiritimati", "2026-06-09T19:00:00.000Z"],
    ["Pacific/Pago_Pago", "2026-06-10T20:00:00.000Z"],
    ["UTC", "2026-06-10T09:00:00.000Z"],
  ])("supports zone %s", (zone, expected) => {
    expect(times({ ...reminder("2026-06-10", zone), notificationDaysBefore: [0] })).toEqual([
      expected,
    ]);
  });
  it("handles a half-hour seasonal transition", () => {
    expect(times(reminder("2026-04-06", "Australia/Lord_Howe"))).toEqual([
      "2026-03-29T22:00:00.000Z",
      "2026-04-04T22:30:00.000Z",
      "2026-04-05T22:30:00.000Z",
    ]);
  });
  it("crosses the year boundary and leap day", () => {
    expect(times(reminder("2027-01-01"))).toEqual([
      "2026-12-25T08:00:00.000Z",
      "2026-12-31T08:00:00.000Z",
      "2027-01-01T08:00:00.000Z",
    ]);
    expect(times(reminder("2028-03-01"))).toContain("2028-02-29T08:00:00.000Z");
  });
  it("excludes elapsed notifications including one exactly at now", () => {
    expect(times(reminder(), "2026-03-29T07:00:00.000Z")).toEqual(["2026-03-30T07:00:00.000Z"]);
    expect(times(reminder(), "2026-03-30T07:00:00.000Z")).toEqual([]);
    expect(times(reminder(), "2026-04-01T00:00:00.000Z")).toEqual([]);
    expect(times(reminder(), "2026-03-30T06:59:59.999Z")).toEqual(["2026-03-30T07:00:00.000Z"]);
  });
  it("returns no notifications when all offsets are disabled", () => {
    expect(times({ ...reminder(), notificationDaysBefore: [] })).toEqual([]);
  });
  it("keeps stable keys and recomputes instants after editing a date", () => {
    const original = reminder();
    const updated = updateReminder(
      original,
      { dueDate: "2026-10-26", notificationDaysBefore: [7, 1, 0] },
      dependencies.clock,
    );
    if (!updated.ok) throw new Error("Invalid fixture");
    const before = planReminderNotifications(original, dependencies.clock.now());
    const after = planReminderNotifications(updated.value, dependencies.clock.now());
    if (!before.ok || !after.ok) throw new Error("Invalid schedule");
    expect(before.value.map((item) => item.key)).toEqual(after.value.map((item) => item.key));
    expect(new Set(after.value.map((item) => item.key)).size).toBe(3);
    expect(before.value.map((item) => item.fireAt)).not.toEqual(
      after.value.map((item) => item.fireAt),
    );
    expect(planReminderNotifications(updated.value, dependencies.clock.now())).toEqual(after);
  });
  it("does not silently move a notification on a skipped calendar day", () => {
    expect(
      planReminderNotifications(
        reminder("2011-12-31", "Pacific/Apia"),
        new Date("2011-12-01T00:00:00.000Z"),
      ),
    ).toEqual({ ok: false, issues: [{ code: "invalid-format", field: "notificationSchedule" }] });
  });
  it("rejects an invalid reference instant", () => {
    expect(() => planReminderNotifications(reminder(), new Date(NaN))).toThrow();
  });
});
