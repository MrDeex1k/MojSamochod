import { distanceToMetres, distanceUnitLabel, metresToDistance } from "./distance";

describe("distance units", () => {
  it.each([
    ["kilometres", 42, 42_000, "km"],
    ["miles", 42, 67_592, "mi"],
  ] as const)(
    "converts %s through the shared canonical metre representation",
    (unit, value, metres, label) => {
      expect(distanceToMetres(value, unit)).toBe(metres);
      expect(Math.round(metresToDistance(metres, unit))).toBe(value);
      expect(distanceUnitLabel(unit)).toBe(label);
    },
  );
});
