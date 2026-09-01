import { parseUnitPriceMilliUnits, pricingFromTotalCost, pricingFromUnitPrice } from "./pricing";

describe("refuelling pricing", () => {
  it("parses at most three decimal places without floating-point storage", () => {
    expect(parseUnitPriceMilliUnits("6.499")).toEqual({ ok: true, value: 6_499 });
    expect(parseUnitPriceMilliUnits("0")).toEqual({ ok: true, value: 0 });
    expect(parseUnitPriceMilliUnits("6.4999")).toEqual({
      issues: [{ code: "invalid-format", field: "unitPrice" }],
      ok: false,
    });
  });

  it("derives and rounds total money from a unit price", () => {
    expect(
      pricingFromUnitPrice({
        currency: "PLN",
        currencyFractionDigits: 2,
        quantityMicrolitres: 37_978_000,
        unitPriceMilliUnits: 6_499,
        unitPriceVolumeUnit: "litres",
      }),
    ).toEqual({
      ok: true,
      value: {
        inputMode: "perVolumeUnit",
        totalCost: { currency: "PLN", minorUnits: 24_682 },
        unitPriceMilliUnits: 6_499,
        unitPriceVolumeUnit: "litres",
      },
    });
  });

  it("derives a three-decimal unit price from total money", () => {
    expect(
      pricingFromTotalCost({
        currencyFractionDigits: 2,
        quantityMicrolitres: 37_978_000,
        totalCost: { currency: "PLN", minorUnits: 24_682 },
        unitPriceVolumeUnit: "litres",
      }),
    ).toEqual({
      ok: true,
      value: {
        inputMode: "total",
        totalCost: { currency: "PLN", minorUnits: 24_682 },
        unitPriceMilliUnits: 6_499,
        unitPriceVolumeUnit: "litres",
      },
    });
  });

  it("respects currencies with zero or three fraction digits", () => {
    expect(
      pricingFromUnitPrice({
        currency: "JPY",
        currencyFractionDigits: 0,
        quantityMicrolitres: 10_000_000,
        unitPriceMilliUnits: 180_000,
        unitPriceVolumeUnit: "litres",
      }),
    ).toMatchObject({ ok: true, value: { totalCost: { currency: "JPY", minorUnits: 1_800 } } });
    expect(
      pricingFromUnitPrice({
        currency: "KWD",
        currencyFractionDigits: 3,
        quantityMicrolitres: 10_000_000,
        unitPriceMilliUnits: 123,
        unitPriceVolumeUnit: "litres",
      }),
    ).toMatchObject({ ok: true, value: { totalCost: { currency: "KWD", minorUnits: 1_230 } } });
  });

  it("rejects invalid currency metadata and unsafe source values", () => {
    expect(
      pricingFromUnitPrice({
        currency: "pln",
        currencyFractionDigits: 4,
        quantityMicrolitres: 0,
        unitPriceMilliUnits: 1.5,
        unitPriceVolumeUnit: "quarts",
      }),
    ).toMatchObject({
      issues: expect.arrayContaining([
        { code: "out-of-range", field: "quantityMicrolitres" },
        { code: "invalid-format", field: "unitPriceVolumeUnit" },
        { code: "out-of-range", field: "unitPriceMilliUnits" },
        { code: "invalid-format", field: "currency" },
        { code: "out-of-range", field: "currencyFractionDigits" },
      ]),
      ok: false,
    });
  });
});
