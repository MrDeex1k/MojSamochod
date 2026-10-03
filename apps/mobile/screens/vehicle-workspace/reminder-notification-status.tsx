import { notificationPresentation } from "./notification-presentation";
import { useSyncExternalStore } from "react";
import { useNotificationActions } from "./use-notification-actions";
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
  const { busy, error, request, retry, settings } = useNotificationActions(notifications, schedule);
  const status = notificationPresentation(result, error);
  return (
    <View className="gap-compact rounded-control bg-surface-muted p-content">
      <Text accessibilityRole="header" className="text-heading font-semibold text-primary">
        {t("reminders.notificationsTitle")}
      </Text>
      <Text accessibilityLiveRegion="polite" className="text-body text-secondary">
        {t(status.message)}
      </Text>
      {status.canRequest ? (
        <>
          <Text className="text-body text-secondary">{t("reminders.permissionExplanation")}</Text>
          <Button
            disabled={busy}
            label={t("reminders.enableNotifications")}
            onPress={() => void request()}
          />
        </>
      ) : null}
      {status.canOpenSettings ? (
        <Button
          disabled={busy}
          label={t("reminders.openSettings")}
          onPress={() => void settings()}
          variant="secondary"
        />
      ) : null}
      {status.failed ? (
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
