import {
  currencyFractionDigits,
  formatCurrencyInputMinorUnits,
  formatCurrencyMinorUnits,
  parseCurrencyInput,
} from "./formatters";

describe("currency formatters", () => {
  it.each([
    ["JPY", 0],
    ["USD", 2],
    ["KWD", 3],
  ])("uses the ISO 4217 fraction digits for %s", (currency, fractionDigits) => {
    expect(currencyFractionDigits(currency, "en-US")).toBe(fractionDigits);
  });

  it.each([
    ["JPY", "123", 123],
    ["USD", "1.23", 123],
    ["KWD", "0.123", 123],
  ])("parses %s amounts into minor units", (currency, input, minorUnits) => {
    expect(parseCurrencyInput(input, currency, "en-US")).toEqual({
      kind: "value",
      minorUnits,
    });
    expect(formatCurrencyInputMinorUnits(minorUnits, currency, "en-US")).toBe(input);
  });

  it("rejects precision unsupported by the selected currency", () => {
    expect(parseCurrencyInput("1.5", "JPY", "en-US")).toEqual({ kind: "invalid" });
    expect(parseCurrencyInput("1.234", "USD", "en-US")).toEqual({ kind: "invalid" });
  });

  it.each(["JPY", "USD", "KWD"])("formats %s minor units using its currency scale", (currency) => {
    const fractionDigits = currencyFractionDigits(currency, "en-US");
    expect(formatCurrencyMinorUnits(123, currency, "en-US")).toBe(
      new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(
        123 / 10 ** fractionDigits,
      ),
    );
  });
});
