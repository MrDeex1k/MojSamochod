import { invalid } from "./result";
import { calendarDate, notificationInstant, reminderTimeZone } from "../reminders/calendar";
import { documentDate } from "../documents/vehicle-document";
import { parseVolumeToMicrolitres } from "../refuelling/volume";
import { pricingFromUnitPrice } from "../refuelling/pricing";
import { mergeUtcDateTime } from "@/components/ui/utc-date-time";

it("requires a reason for validation failure", () => expect(() => invalid([])).toThrow());
it.each(["0000-01-01", "2026-13-01", "2026-02-30"])("shares date validation: %s", (value) => {
  expect(calendarDate(value).ok).toBe(false);
  expect(documentDate(value).ok).toBe(false);
});
it.each(["0001-01-01", "9999-12-30", "9999-12-31"])(
  "plans the full supported date range: %s",
  (value) => {
    const zone = reminderTimeZone("UTC");
    if (!zone.ok) throw new Error("zone");
    expect(notificationInstant(value, zone.value)?.toISOString()).toBe(`${value}T09:00:00.000Z`);
  },
);
it("preserves years below 100 when editing either date or time", () => {
  const early = new Date("0099-06-01T12:30:00.000Z");
  const modern = new Date("2026-11-05T15:45:00.000Z");
  expect(mergeUtcDateTime(early, modern, "time").toISOString()).toBe("0099-06-01T15:45:00.000Z");
  expect(mergeUtcDateTime(modern, early, "date").toISOString()).toBe("0099-06-01T15:45:00.000Z");
});
it.each([-1, 0.5, Infinity, NaN, 7])("rejects invalid parser precision %s", (precision) => {
  expect(parseVolumeToMicrolitres("1", "litres", "volume", precision).ok).toBe(false);
});
it("rejects a scale that disagrees with the currency", () => {
  expect(
    pricingFromUnitPrice({
      currency: "JPY",
      currencyFractionDigits: 2,
      quantityMicrolitres: 1000000,
      unitPriceMilliUnits: 1000,
      unitPriceVolumeUnit: "litres",
    }).ok,
  ).toBe(false);
});
