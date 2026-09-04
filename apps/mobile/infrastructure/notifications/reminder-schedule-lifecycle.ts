import { AppState } from "react-native";
import type { i18n } from "i18next";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";

export function startReminderScheduleLifecycle(
  schedule: ReminderSchedule,
  translation: i18n,
): () => void {
  const refresh = () => {
    void schedule.reconcile();
  };
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") refresh();
  });
  translation.on("languageChanged", refresh);
  refresh();
  return () => {
    subscription.remove();
    translation.off("languageChanged", refresh);
  };
}
