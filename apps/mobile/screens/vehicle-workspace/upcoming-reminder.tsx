import { useEffect, useState } from "react";
import { AppState, Pressable, Text } from "react-native";
import { reminderStatus, type Reminder } from "@/domain/reminders/reminder";
import { formatCalendarDate } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

export function UpcomingReminder({
  reminder,
  onPress,
}: {
  reminder: Reminder;
  onPress: () => void;
}) {
  const { t, i18n } = useAppTranslation();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  const status = reminderStatus(reminder, now);
  const label = `${t(`reminders.kinds.${reminder.kind}`)}, ${formatCalendarDate(reminder.dueDate, i18n.language)}, ${t(`reminders.status.${status}`)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="gap-compact border-b border-divider py-control"
    >
      <Text className="text-body font-semibold text-primary">
        {t(`reminders.kinds.${reminder.kind}`)} ·{" "}
        {formatCalendarDate(reminder.dueDate, i18n.language)}
      </Text>
      <Text
        className={status === "overdue" ? "text-caption text-danger" : "text-caption text-accent"}
      >
        {t(`reminders.status.${status}`)}
      </Text>
    </Pressable>
  );
}
