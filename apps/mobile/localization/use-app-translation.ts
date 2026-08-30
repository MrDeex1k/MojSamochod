import { useTranslation } from "react-i18next";

import { appI18n } from "./i18n";

export function useAppTranslation() {
  return useTranslation("translation", { i18n: appI18n });
}
