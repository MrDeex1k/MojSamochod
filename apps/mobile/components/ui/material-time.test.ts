import { deviceClockToUtc, utcClockForDevice } from "./material-time";

describe("Material clock UTC adapter", () => {
  it.each(["2026-03-29T01:30:00Z", "2026-10-25T02:30:00Z", "2026-12-31T23:45:00Z"])(
    "preserves UTC wall time for %s independently of the device offset",
    (iso) => {
      const original = new Date(iso);
      const device = utcClockForDevice(original);
      expect(device.getHours()).toBe(original.getUTCHours());
      expect(device.getMinutes()).toBe(original.getUTCMinutes());
      expect(deviceClockToUtc(original, device).toISOString()).toBe(original.toISOString());
    },
  );
  it("changes only UTC hours and minutes without shifting the calendar date", () => {
    const original = new Date("2026-12-31T23:45:00Z");
    const selected = new Date(2000, 0, 15, 0, 10);
    expect(deviceClockToUtc(original, selected).toISOString()).toBe("2026-12-31T00:10:00.000Z");
    expect(original.toISOString()).toBe("2026-12-31T23:45:00.000Z");
  });
});
