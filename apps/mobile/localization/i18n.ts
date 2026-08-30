import { getLocales, type Locale } from "expo-localization";
import { createInstance, type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./resources/en";
import { pl } from "./resources/pl";

export type SupportedLanguage = "en" | "pl";

export const fallbackLanguage: SupportedLanguage = "en";
export const resources = { en: { translation: en }, pl: { translation: pl } } as const;

export function resolveSupportedLanguage(
  locales: readonly Pick<Locale, "languageCode">[],
): SupportedLanguage {
  return locales[0]?.languageCode === "pl" ? "pl" : fallbackLanguage;
}

export function createAppI18n(language: string): I18nInstance {
  const instance = createInstance();

  void instance.use(initReactI18next).init({
    fallbackLng: fallbackLanguage,
    initAsync: false,
    interpolation: { escapeValue: false },
    lng: language,
    load: "languageOnly",
    resources,
    supportedLngs: ["en", "pl"],
  });

  return instance;
}

export const appI18n = createAppI18n(resolveSupportedLanguage(getLocales()));
