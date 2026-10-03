import { useState } from "react";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";

export function useNotificationActions(
  notifications: ReminderNotifications,
  schedule: ReminderSchedule,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const run = async (operation: () => Promise<boolean>) => {
    if (busy) return;
    setBusy(true);
    setError(false);
    await operation()
      .then((ok) => setError(!ok))
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };
  return {
    busy,
    error,
    request: () =>
      run(async () => {
        const response = await notifications.requestPermissionAfterExplanation();
        await schedule.reconcile();
        return response.ok;
      }),
    retry: () =>
      run(async () => {
        await schedule.reconcile();
        return true;
      }),
    settings: () =>
      run(async () => {
        const response = await notifications.openSettings();
        return response.ok;
      }),
  };
}
