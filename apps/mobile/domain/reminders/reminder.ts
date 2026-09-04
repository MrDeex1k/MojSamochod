import { reminderIdFromUuidV7, type ReminderId, type VehicleId } from "../shared/identifiers";
import type { Clock, IdGenerator } from "../shared/ports";
import { invalid, valid, type ValidationIssue, type ValidationResult } from "../shared/result";
import { utcTimestampFromDate, type UtcTimestamp } from "../shared/value-objects";
import {
  calendarDate,
  dateInReminderZone,
  reminderTimeZone,
  type CalendarDate,
  type ReminderTimeZone,
} from "./calendar";

export type ReminderKind = "insurance" | "technicalInspection";
export type ReminderStatus = "upcoming" | "dueToday" | "overdue";
export type NotificationDaysBefore = 7 | 1 | 0;
export const defaultNotificationDaysBefore: readonly NotificationDaysBefore[] = Object.freeze([
  7, 1, 0,
]);

export type Reminder = Readonly<{
  createdAt: UtcTimestamp;
  dueDate: CalendarDate;
  id: ReminderId;
  kind: ReminderKind;
  notificationDaysBefore: readonly NotificationDaysBefore[];
  timeZone: ReminderTimeZone;
  updatedAt: UtcTimestamp;
  vehicleId: VehicleId;
}>;

export type EditReminderInput = Readonly<{
  dueDate: string;
  notificationDaysBefore: readonly number[];
}>;

export type CreateReminderInput = Readonly<{
  dueDate: string;
  kind: string;
  notificationDaysBefore?: readonly number[];
  timeZone: string;
  vehicleId: VehicleId;
}>;

export function createReminder(
  input: CreateReminderInput,
  dependencies: Readonly<{ clock: Clock; idGenerator: IdGenerator }>,
): ValidationResult<Reminder> {
  const issues: ValidationIssue[] = [];
  const editable = validateEditable({
    dueDate: input.dueDate,
    notificationDaysBefore: input.notificationDaysBefore ?? defaultNotificationDaysBefore,
  });
  const zone = reminderTimeZone(input.timeZone);
  if (!editable.ok) issues.push(...editable.issues);
  if (!zone.ok) issues.push(...zone.issues);
  if (input.kind !== "insurance" && input.kind !== "technicalInspection") {
    issues.push({ code: "invalid-format", field: "kind" });
  }
  if (issues.length > 0 || !editable.ok || !zone.ok) return invalid(issues);

  const timestamp = utcTimestampFromDate(dependencies.clock.now());
  return valid({
    ...editable.value,
    createdAt: timestamp,
    id: reminderIdFromUuidV7(dependencies.idGenerator.generate()),
    kind: input.kind as ReminderKind,
    timeZone: zone.value,
    updatedAt: timestamp,
    vehicleId: input.vehicleId,
  });
}

export function updateReminder(
  existing: Reminder,
  input: EditReminderInput,
  clock: Clock,
): ValidationResult<Reminder> {
  const editable = validateEditable(input);
  return editable.ok
    ? valid({ ...existing, ...editable.value, updatedAt: utcTimestampFromDate(clock.now()) })
    : editable;
}

export function reminderStatus(reminder: Reminder, now: Date): ReminderStatus {
  const today = dateInReminderZone(now, reminder.timeZone);
  if (reminder.dueDate === today) return "dueToday";
  return reminder.dueDate < today ? "overdue" : "upcoming";
}

function validateEditable(
  input: EditReminderInput,
): ValidationResult<Pick<Reminder, "dueDate" | "notificationDaysBefore">> {
  const date = calendarDate(input.dueDate);
  const issues: ValidationIssue[] = date.ok ? [] : [...date.issues];
  if (
    input.notificationDaysBefore.some((value) => value !== 7 && value !== 1 && value !== 0) ||
    new Set(input.notificationDaysBefore).size !== input.notificationDaysBefore.length
  ) {
    issues.push({ code: "invalid-format", field: "notificationDaysBefore" });
  }
  if (issues.length > 0 || !date.ok) return invalid(issues);
  return valid({
    dueDate: date.value,
    notificationDaysBefore: [...input.notificationDaysBefore].sort(
      (left, right) => right - left,
    ) as NotificationDaysBefore[],
  });
}
