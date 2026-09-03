import { useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import type { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/localization/use-app-translation";

export function ReminderNotificationStatus({
  notifications,
  schedule,
}: Readonly<{
  notifications: ReminderNotifications;
  schedule: ReminderSchedule;
}>) {
  const { t } = useAppTranslation();
  const result = useSyncExternalStore(
    schedule.subscribe,
    schedule.getSnapshot,
    schedule.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const permission = result?.permission;
  const request = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await notifications.requestPermissionAfterExplanation();
      if (!response.ok) setError(true);
      await schedule.reconcile();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const retry = async () => {
    setBusy(true);
    setError(false);
    try {
      await schedule.reconcile();
    } finally {
      setBusy(false);
    }
  };
  const settings = async () => {
    setBusy(true);
    setError(false);
    try {
      const response = await notifications.openSettings();
      if (!response.ok) setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const canRequest =
    permission && !permission.canSchedule && permission.canAskAgain && !permission.channelBlocked;
  return (
    <View className="gap-compact rounded-control bg-surface-muted p-content">
      <Text accessibilityRole="header" className="text-heading font-semibold text-primary">
        {t("reminders.notificationsTitle")}
      </Text>
      <Text accessibilityLiveRegion="polite" className="text-body text-secondary">
        {t(
          !permission
            ? result && !result.ok
              ? "reminders.permissionUnavailable"
              : "reminders.permissionUnknown"
            : permission.status === "provisional"
              ? "reminders.permissionQuiet"
              : permission.canSchedule
                ? "reminders.permissionEnabled"
                : "reminders.permissionDisabled",
        )}
      </Text>
      {canRequest ? (
        <>
          <Text className="text-body text-secondary">{t("reminders.permissionExplanation")}</Text>
          <Button
            disabled={busy}
            label={t("reminders.enableNotifications")}
            onPress={() => void request()}
          />
        </>
      ) : null}
      {permission && (!permission.canSchedule || permission.status === "provisional") ? (
        <Button
          disabled={busy}
          label={t("reminders.openSettings")}
          onPress={() => void settings()}
          variant="secondary"
        />
      ) : null}
      {error || (result && !result.ok) ? (
        <>
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t("reminders.scheduleError")}
          </Text>
          <Button
            disabled={busy}
            label={t("reminders.retry")}
            onPress={() => void retry()}
            variant="secondary"
          />
        </>
      ) : null}
      <Text className="text-caption text-secondary">{t("reminders.deliveryDisclaimer")}</Text>
    </View>
  );
}
