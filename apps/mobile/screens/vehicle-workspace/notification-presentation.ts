import type { ReconciliationResult } from "@/application/notifications/reminder-schedule";

export function notificationPresentation(result: ReconciliationResult | null, error: boolean) {
  const permission = result?.permission;
  const message = !permission
    ? result && !result.ok
      ? "reminders.permissionUnavailable"
      : "reminders.permissionUnknown"
    : permission.status === "provisional"
      ? "reminders.permissionQuiet"
      : permission.canSchedule
        ? "reminders.permissionEnabled"
        : "reminders.permissionDisabled";
  return {
    message,
    canRequest: Boolean(
      permission && !permission.canSchedule && permission.canAskAgain && !permission.channelBlocked,
    ),
    canOpenSettings: Boolean(
      permission && (!permission.canSchedule || permission.status === "provisional"),
    ),
    failed: error || Boolean(result && !result.ok),
  };
}
