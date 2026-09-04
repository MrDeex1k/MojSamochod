import type { ReminderId } from "../shared/identifiers";
import { invalid, valid, type ValidationResult } from "../shared/result";
import { utcTimestampFromDate, type UtcTimestamp } from "../shared/value-objects";
import { dateInReminderZone, notificationInstant, subtractCalendarDays } from "./calendar";
import type { NotificationDaysBefore, Reminder } from "./reminder";

export type PlannedReminderNotification = Readonly<{
  daysBefore: NotificationDaysBefore;
  fireAt: UtcTimestamp;
  key: string;
  reminderId: ReminderId;
}>;

export function planReminderNotifications(
  reminder: Reminder,
  now: Date,
): ValidationResult<readonly PlannedReminderNotification[]> {
  const today = dateInReminderZone(now, reminder.timeZone);
  const notifications: PlannedReminderNotification[] = [];
  for (const daysBefore of reminder.notificationDaysBefore) {
    const date = subtractCalendarDays(reminder.dueDate, daysBefore);
    if (date < today) continue;
    const instant = notificationInstant(date, reminder.timeZone);
    if (!instant) return invalid([{ code: "invalid-format", field: "notificationSchedule" }]);
    if (instant.getTime() <= now.getTime()) continue;
    notifications.push({
      daysBefore,
      fireAt: utcTimestampFromDate(instant),
      key: `reminder:${reminder.id}:${daysBefore}`,
      reminderId: reminder.id,
    });
  }
  return valid(notifications.sort((left, right) => left.fireAt.localeCompare(right.fireAt)));
}
