import { positiveMicrolitres } from "@/domain/refuelling/volume";

import { formatConvertedUnitPrice, formatEditableFuelVolume } from "./refuelling-presentation";

describe("refuelling presentation", () => {
  it("uses the locale decimal separator for an editable fuel quantity", () => {
    const quantity = positiveMicrolitres(45_000_000);
    if (!quantity.ok) throw new Error("Expected a valid quantity fixture");

    expect(formatEditableFuelVolume(quantity.value, "usGallons", "pl")).toBe("11,89");
    expect(formatEditableFuelVolume(quantity.value, "usGallons", "en")).toBe("11.89");
  });

  it("does not label an unconverted source price as the target unit", () => {
    expect(
      formatConvertedUnitPrice(Number.MAX_SAFE_INTEGER, "litres", "imperialGallons", "en"),
    ).toBeUndefined();
  });
});
