const scales = new Map<string, number>();
/** Accept canonical three-letter codes, including historic/custom codes; Intl defaults unknown codes to two digits. */
export function currencyDecimalPlaces(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Expected a canonical currency code");
  let digits = scales.get(currency);
  if (digits === undefined) {
    digits =
      new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    scales.set(currency, digits);
  }
  return digits;
}
