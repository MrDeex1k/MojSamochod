import {
  microlitresToVolume,
  parseVolumeToMicrolitres,
  positiveMicrolitres,
  volumeUnit,
} from "./volume";

describe("fuel volume", () => {
  it.each([
    ["1", "litres", 1_000_000],
    ["0.001", "litres", 1_000],
    ["1", "usGallons", 3_785_412],
    ["1", "imperialGallons", 4_546_090],
  ])("converts %s %s to canonical microlitres", (value, unit, expected) => {
    expect(parseVolumeToMicrolitres(value, unit)).toEqual({ ok: true, value: expected });
  });

  it("converts canonical quantities back to every supported display unit", () => {
    const quantity = positiveMicrolitres(4_546_090);
    if (!quantity.ok) throw new Error("Expected valid volume fixture");
    expect(microlitresToVolume(quantity.value, "litres")).toBeCloseTo(4.54609, 6);
    expect(microlitresToVolume(quantity.value, "usGallons")).toBeCloseTo(1.200_95, 5);
    expect(microlitresToVolume(quantity.value, "imperialGallons")).toBe(1);
  });

  it("rejects zero, excessive precision, localized separators, and unsupported units", () => {
    expect(parseVolumeToMicrolitres("0", "litres")).toEqual({
      issues: [{ code: "out-of-range", field: "quantity.value" }],
      ok: false,
    });
    expect(parseVolumeToMicrolitres("1.1234567", "litres")).toEqual({
      issues: [{ code: "invalid-format", field: "quantity.value" }],
      ok: false,
    });
    expect(parseVolumeToMicrolitres("1,5", "litres")).toEqual({
      issues: [{ code: "invalid-format", field: "quantity.value" }],
      ok: false,
    });
    expect(volumeUnit("quarts")).toEqual({
      issues: [{ code: "invalid-format", field: "inputVolumeUnit" }],
      ok: false,
    });
  });
});
