import type { i18n } from "i18next";
import type { Reminder } from "@/domain/reminders/reminder";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { appI18n } from "./i18n";
import { formatCalendarDate } from "./formatters";

export function reminderNotificationContent(
  reminder: Reminder,
  vehicle: Vehicle,
  translation: i18n = appI18n,
) {
  const title = translation.t(
    reminder.kind === "insurance"
      ? "notifications.insuranceTitle"
      : "notifications.inspectionTitle",
  );
  return {
    title,
    body: translation.t("notifications.validUntil", {
      vehicle: `${vehicle.make} ${vehicle.model}`,
      date: formatCalendarDate(reminder.dueDate, translation.resolvedLanguage ?? "en"),
    }),
  };
}
