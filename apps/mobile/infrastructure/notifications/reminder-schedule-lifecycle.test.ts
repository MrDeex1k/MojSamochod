import { AppState, type AppStateStatus } from "react-native";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import { createAppI18n } from "@/localization/i18n";
import { startReminderScheduleLifecycle } from "./reminder-schedule-lifecycle";

it("refreshes on startup, foreground and language changes, and removes listeners on cleanup", async () => {
  let change!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    change = listener;
    return { remove };
  });
  const reconcile = jest.fn().mockResolvedValue({ ok: true });
  const translation = createAppI18n("en");
  const cleanup = startReminderScheduleLifecycle(
    { reconcile } as unknown as ReminderSchedule,
    translation,
  );
  expect(reconcile).toHaveBeenCalledTimes(1);
  change("background");
  change("inactive");
  expect(reconcile).toHaveBeenCalledTimes(1);
  change("active");
  expect(reconcile).toHaveBeenCalledTimes(2);
  await translation.changeLanguage("pl");
  expect(reconcile).toHaveBeenCalledTimes(3);
  cleanup();
  expect(remove).toHaveBeenCalledTimes(1);
  await translation.changeLanguage("en");
  expect(reconcile).toHaveBeenCalledTimes(3);
});
