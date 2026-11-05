import { useRef, useState } from "react";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";

export function useNotificationActions(
  notifications: ReminderNotifications,
  schedule: ReminderSchedule,
) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState(false);
  const run = async (operation: () => Promise<boolean>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    await operation()
      .then((ok) => setError(!ok))
      .catch(() => setError(true))
      .finally(() => {
        pending.current = false;
        setBusy(false);
      });
  };
  return {
    busy,
    error,
    request: () =>
      run(() =>
        // Reconciliation must read permission only after the system prompt has completed.
        notifications.requestPermissionAfterExplanation().then(async (response) => {
          const reconciled = await schedule.reconcile();
          return response.ok && reconciled.ok;
        }),
      ),
    retry: () =>
      run(async () => {
        return (await schedule.reconcile()).ok;
      }),
    settings: () =>
      run(async () => {
        const response = await notifications.openSettings();
        return response.ok;
      }),
  };
}
