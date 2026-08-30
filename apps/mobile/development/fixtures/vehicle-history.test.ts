import { compareHistoryEntriesNewestFirst } from "@/domain/history/history-entry";

import { createDevelopmentVehicleHistoryFixture } from "./vehicle-history";

describe("development vehicle history fixture", () => {
  it("is deterministic and contains every Phase 2 history entry type", () => {
    const first = createDevelopmentVehicleHistoryFixture();
    const second = createDevelopmentVehicleHistoryFixture();

    expect(first).toEqual(second);
    expect(first.entries.map(({ type }) => type).sort()).toEqual([
      "inspection",
      "repair",
      "replacement",
    ]);
    expect(first.entries.every(({ vehicleId }) => vehicleId === first.vehicle.id)).toBe(true);
  });

  it("can exercise the production timeline ordering rule", () => {
    const fixture = createDevelopmentVehicleHistoryFixture();

    expect(
      [...fixture.entries].sort(compareHistoryEntriesNewestFirst).map(({ type }) => type),
    ).toEqual(["repair", "replacement", "inspection"]);
  });
});
