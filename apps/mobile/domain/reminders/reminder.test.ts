import { reminderIdFromUuidV7, vehicleIdFromUuidV7 } from "../shared/identifiers";
import { calendarDate, reminderTimeZone } from "./calendar";
import { createReminder, reminderStatus, updateReminder } from "./reminder";

const vehicleId = vehicleIdFromUuidV7("01941f29-7c00-73e4-a310-744d2167fc5b");
const id = "01941f29-7c00-73e5-a310-744d2167fc5b";
const clock = { now: () => new Date("2026-09-03T10:00:00.000Z") };
const input = {
  dueDate: "2026-10-01",
  kind: "insurance",
  timeZone: "Europe/Warsaw",
  vehicleId,
};
const dependencies = { clock, idGenerator: { generate: () => id } };

describe("Reminder", () => {
  it.each(["insurance", "technicalInspection"])("creates %s with default offsets", (kind) => {
    const result = createReminder({ ...input, kind }, dependencies);
    expect(result).toEqual({
      ok: true,
      value: {
        ...input,
        createdAt: clock.now().toISOString(),
        id,
        kind,
        notificationDaysBefore: [7, 1, 0],
        updatedAt: clock.now().toISOString(),
      },
    });
  });

  it("preserves identity, owner, kind, creation timestamp and time zone on edit", () => {
    const created = createReminder(input, dependencies);
    if (!created.ok) throw new Error("Invalid fixture");
    const offsets = [0, 7];
    const editInput = {
      dueDate: "2027-02-01",
      notificationDaysBefore: offsets,
      timeZone: "America/New_York",
      kind: "technicalInspection",
      vehicleId: "other",
      id: "other",
    };
    const edited = updateReminder(
      created.value,
      // Extra runtime properties from a form must not change protected metadata.
      editInput,
      { now: () => new Date("2026-09-04T10:00:00.000Z") },
    );
    expect(edited).toEqual({
      ok: true,
      value: {
        ...created.value,
        dueDate: "2027-02-01",
        notificationDaysBefore: [7, 0],
        updatedAt: "2026-09-04T10:00:00.000Z",
      },
    });
    offsets.push(1);
    expect(edited.ok && edited.value.notificationDaysBefore).toEqual([7, 0]);
    expect(created.value.dueDate).toBe("2026-10-01");
  });

  it("accepts an overdue date with all notifications disabled", () => {
    expect(
      createReminder({ ...input, dueDate: "2020-01-01", notificationDaysBefore: [] }, dependencies),
    ).toMatchObject({ ok: true, value: { notificationDaysBefore: [] } });
  });

  it("collects validation errors without generating an identifier", () => {
    const idGenerator = { generate: jest.fn(() => id) };
    expect(
      createReminder(
        {
          ...input,
          dueDate: "2026-02-30",
          kind: "oil",
          timeZone: "+02:00",
          notificationDaysBefore: [2],
        },
        { clock, idGenerator },
      ),
    ).toEqual({
      ok: false,
      issues: expect.arrayContaining([
        { code: "invalid-format", field: "dueDate" },
        { code: "invalid-format", field: "kind" },
        { code: "invalid-format", field: "timeZone" },
        { code: "invalid-format", field: "notificationDaysBefore" },
      ]),
    });
    expect(idGenerator.generate).not.toHaveBeenCalled();
  });

  it.each([[7, 7], [0, 0], [-1], [1.5], [NaN], [Infinity]])(
    "rejects invalid offsets %j",
    (...offsets) => {
      expect(createReminder({ ...input, notificationDaysBefore: offsets }, dependencies).ok).toBe(
        false,
      );
    },
  );

  it("rejects invalid edits without mutating the reminder", () => {
    const created = createReminder(input, dependencies);
    if (!created.ok) throw new Error("Invalid fixture");
    expect(
      updateReminder(created.value, { dueDate: "bad", notificationDaysBefore: [] }, clock).ok,
    ).toBe(false);
    expect(created.value.dueDate).toBe(input.dueDate);
  });

  it.each([
    ["2026-09-30T21:59:59.999Z", "upcoming"],
    ["2026-09-30T22:00:00.000Z", "dueToday"],
    ["2026-10-01T21:59:59.999Z", "dueToday"],
    ["2026-10-01T22:00:00.000Z", "overdue"],
  ])("derives status at Warsaw midnight: %s", (now, status) => {
    const created = createReminder(input, dependencies);
    if (!created.ok) throw new Error("Invalid fixture");
    expect(reminderStatus(created.value, new Date(now))).toBe(status);
  });

  it("rejects an invalid clock", () => {
    expect(() =>
      createReminder(input, { ...dependencies, clock: { now: () => new Date(NaN) } }),
    ).toThrow();
  });

  it("requires a canonical UUIDv7 for reminder identifiers", () => {
    expect(reminderIdFromUuidV7(id)).toBe(id);
    expect(() => reminderIdFromUuidV7("01941f29-7c00-43e5-a310-744d2167fc5b")).toThrow();
  });
});

describe("Reminder calendar values", () => {
  it.each(["2024-02-29", "2000-02-29", "0001-01-01", "9999-12-31"])("accepts %s", (date) => {
    expect(calendarDate(date)).toEqual({ ok: true, value: date });
  });
  it.each([
    "2026-02-29",
    "1900-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "2026-1-01",
    "2026-01-01T00:00:00.000Z",
    "0000-01-01",
    " 2026-01-01",
    "bad",
  ])("rejects %s", (date) => {
    expect(calendarDate(date).ok).toBe(false);
  });
  it.each(["", "Mars/Olympus", "+02:00", "-0500", " Europe/Warsaw"])(
    "rejects invalid zone %s",
    (zone) => {
      expect(reminderTimeZone(zone).ok).toBe(false);
    },
  );
  it.each(["UTC", "Europe/Warsaw", "Asia/Kathmandu", "Australia/Lord_Howe"])(
    "accepts named zone %s",
    (zone) => {
      expect(reminderTimeZone(zone).ok).toBe(true);
    },
  );
});
