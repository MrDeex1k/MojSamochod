import type { PlannedReminderNotification } from "@/domain/reminders/notification-plan";
import type { VehicleId } from "@/domain/shared/identifiers";

export type NotificationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      error: {
        kind: "unsupported" | "unavailable" | "permission-denied" | "invalid-request";
        operation: string;
        cause?: unknown;
      };
    }>;

export type ReminderNotificationPermission = Readonly<{
  status: "undetermined" | "denied" | "granted" | "provisional";
  canAskAgain: boolean;
  channelBlocked: boolean;
  canSchedule: boolean;
}>;

export type ReminderNotificationRequest = Readonly<{
  plan: PlannedReminderNotification;
  vehicleId: VehicleId;
  title: string;
  body: string;
}>;

export type ScheduledReminderNotification = Readonly<{
  identifier: string;
  // Owned but malformed/older metadata remains visible so reconciliation can remove it.
  request: ReminderNotificationRequest | null;
}>;

export interface ReminderNotifications {
  getPermission(): Promise<NotificationResult<ReminderNotificationPermission>>;
  /** Call only after the user accepts the contextual explanation, never on startup or save. */
  requestPermissionAfterExplanation(): Promise<NotificationResult<ReminderNotificationPermission>>;
  openSettings(): Promise<NotificationResult<void>>;
  schedule(request: ReminderNotificationRequest): Promise<NotificationResult<string>>;
  list(): Promise<NotificationResult<readonly ScheduledReminderNotification[]>>;
  cancel(identifier: string): Promise<NotificationResult<void>>;
}
