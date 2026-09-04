import { createReminder, type Reminder } from "@/domain/reminders/reminder";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import { utcTimestamp } from "@/domain/shared/value-objects";
import { CorruptStoredDataError } from "./row-mappers";
import type { reminders } from "./schema";

export function reminderValues(reminder: Reminder): typeof reminders.$inferInsert {
  return {
    createdAt: reminder.createdAt,
    dueDate: reminder.dueDate,
    id: reminder.id,
    kind: reminder.kind,
    notifyOnDueDate: Number(reminder.notificationDaysBefore.includes(0)),
    notifyOneDayBefore: Number(reminder.notificationDaysBefore.includes(1)),
    notifySevenDaysBefore: Number(reminder.notificationDaysBefore.includes(7)),
    timeZone: reminder.timeZone,
    updatedAt: reminder.updatedAt,
    vehicleId: reminder.vehicleId,
  };
}

export function mapReminderRow(row: typeof reminders.$inferSelect): Reminder {
  const createdAt = utcTimestamp(row.createdAt, "createdAt");
  const updatedAt = utcTimestamp(row.updatedAt, "updatedAt");
  if (!createdAt.ok || !updatedAt.ok) throw new CorruptStoredDataError("reminder.timestamps");
  const flags = [row.notifySevenDaysBefore, row.notifyOneDayBefore, row.notifyOnDueDate];
  if (flags.some((flag) => flag !== 0 && flag !== 1)) {
    throw new CorruptStoredDataError("reminder.notificationDaysBefore");
  }
  try {
    const result = createReminder(
      {
        dueDate: row.dueDate,
        kind: row.kind,
        notificationDaysBefore: [7, 1, 0].filter((_, index) => flags[index] === 1),
        timeZone: row.timeZone,
        vehicleId: vehicleIdFromUuidV7(row.vehicleId),
      },
      {
        clock: { now: () => new Date(createdAt.value) },
        idGenerator: { generate: () => row.id },
      },
    );
    if (!result.ok) throw new CorruptStoredDataError("reminder");
    return { ...result.value, updatedAt: updatedAt.value };
  } catch {
    throw new CorruptStoredDataError("reminder");
  }
}
