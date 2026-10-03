import { mergeUtcDateTime } from "./utc-date-time";

it("changes a UTC calendar date across daylight saving time without shifting the hour", () => {
  expect(
    mergeUtcDateTime(
      new Date("2026-03-28T23:45:32.500Z"),
      new Date("2026-03-29T00:00:00Z"),
      "date",
    ).toISOString(),
  ).toBe("2026-03-29T23:45:00.000Z");
});
it("changes UTC time without replacing the selected day", () => {
  expect(
    mergeUtcDateTime(
      new Date("2026-10-25T23:45:00Z"),
      new Date("1970-01-01T00:15:00Z"),
      "time",
    ).toISOString(),
  ).toBe("2026-10-25T00:15:00.000Z");
});
