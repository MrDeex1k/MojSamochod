import type { AlertButton, AlertOptions } from "react-native";
import { appI18n } from "@/localization/i18n";
import { alertStore } from "./alert-store";
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    alertStore.show({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: appI18n.t("reminders.confirmDate") }],
      options,
    });
  },
};
