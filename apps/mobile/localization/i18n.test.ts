import { createAppI18n, fallbackLanguage, resolveSupportedLanguage } from "./i18n";

describe("application localization", () => {
  it("uses Polish for a Polish system locale", () => {
    expect(resolveSupportedLanguage([{ languageCode: "pl" }])).toBe("pl");
  });

  it.each([
    { locales: [{ languageCode: "de" }] },
    { locales: [{ languageCode: null }] },
    { locales: [] },
  ])("falls back to English for unsupported locales", ({ locales }) => {
    expect(resolveSupportedLanguage(locales)).toBe(fallbackLanguage);
  });

  it("returns English text when an unsupported language is requested", () => {
    const i18n = createAppI18n("de-DE");

    expect(i18n.t("firstVehicle.title")).toBe("Add your first vehicle");
    expect(i18n.resolvedLanguage).toBe("en");
  });

  it("keeps Polish and English catalogs structurally aligned", () => {
    const i18n = createAppI18n("pl-PL");
    const polishKeys = Object.keys(i18n.getResourceBundle("pl", "translation"));
    const englishKeys = Object.keys(i18n.getResourceBundle("en", "translation"));

    expect(polishKeys).toEqual(englishKeys);
  });
});
