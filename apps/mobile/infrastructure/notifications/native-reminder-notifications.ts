import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import type {
  NotificationResult,
  ReminderNotificationPermission,
  ReminderNotificationRequest,
  ReminderNotifications,
  ScheduledReminderNotification,
} from "@/application/notifications/reminder-notifications";
import { isUuidV7 } from "@/domain/shared/identifiers";
import type { Clock } from "@/domain/shared/ports";
import { utcTimestamp } from "@/domain/shared/value-objects";

export const reminderChannelId = "vehicle-reminders-v1";
const owner = "moje-auto-reminders";

export class NativeReminderNotifications implements ReminderNotifications {
  private permissionRequest:
    | Promise<NotificationResult<ReminderNotificationPermission>>
    | undefined;

  constructor(
    private readonly clock: Clock,
    private readonly channelName: () => string,
    private readonly onPermissionChanged: () => void = () => undefined,
  ) {}

  getPermission(): Promise<NotificationResult<ReminderNotificationPermission>> {
    return this.perform("notifications.permission", () => this.readPermission());
  }

  requestPermissionAfterExplanation(): Promise<NotificationResult<ReminderNotificationPermission>> {
    if (this.permissionRequest) return this.permissionRequest;
    this.permissionRequest = this.perform("notifications.requestPermission", async () => {
      // Android 13+ needs a channel before the notification permission prompt.
      await this.ensureChannel();
      const current = await this.readPermission();
      if (current.status === "granted" || current.status === "provisional" || !current.canAskAgain)
        return current;
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
      return this.readPermission();
    }).finally(() => {
      this.permissionRequest = undefined;
      this.onPermissionChanged();
    });
    return this.permissionRequest;
  }

  openSettings(): Promise<NotificationResult<void>> {
    return this.perform("notifications.openSettings", () => Linking.openSettings());
  }

  async schedule(request: ReminderNotificationRequest): Promise<NotificationResult<string>> {
    const operation = "notifications.schedule";
    if (!validRequest(request)) return failure("invalid-request", operation);
    const permission = await this.getPermission();
    if (!permission.ok) return permission;
    if (!permission.value.canSchedule) return failure("permission-denied", operation);
    // Permission is never requested implicitly while scheduling.
    const channel = await this.perform(operation, async () => {
      await this.ensureChannel();
      return this.readPermission();
    });
    if (!channel.ok) return channel;
    if (!channel.value.canSchedule) return failure("permission-denied", operation);
    const now = this.clock.now().getTime();
    if (!Number.isFinite(now) || Date.parse(request.plan.fireAt) <= now)
      return failure("invalid-request", operation);
    return this.perform(operation, () =>
      Notifications.scheduleNotificationAsync({
        identifier: request.plan.key,
        content: {
          title: request.title,
          body: request.body,
          sound: "default",
          data: { owner, version: 1, vehicleId: request.vehicleId, ...request.plan },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(request.plan.fireAt),
          ...(Platform.OS === "android" ? { channelId: reminderChannelId } : {}),
        },
      }),
    );
  }

  list(): Promise<NotificationResult<readonly ScheduledReminderNotification[]>> {
    return this.perform("notifications.list", async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const owned: ScheduledReminderNotification[] = [];
      for (const notification of scheduled) {
        if (isOwned(notification))
          owned.push({ identifier: notification.identifier, request: readRequest(notification) });
      }
      return owned;
    });
  }

  cancel(identifier: string): Promise<NotificationResult<void>> {
    if (!identifier.startsWith("reminder:"))
      return Promise.resolve(failure("invalid-request", "notifications.cancel"));
    return this.perform("notifications.cancel", () =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    );
  }

  private async readPermission(): Promise<ReminderNotificationPermission> {
    const permission = await Notifications.getPermissionsAsync();
    const channel =
      Platform.OS === "android"
        ? await Notifications.getNotificationChannelAsync(reminderChannelId)
        : null;
    const channelBlocked =
      Platform.OS === "android" &&
      (channel?.importance === Notifications.AndroidImportance.NONE ||
        permission.android?.importance === Notifications.AndroidImportance.NONE);
    const status = permissionStatus(permission);
    return {
      status,
      canAskAgain: permission.canAskAgain,
      channelBlocked,
      canSchedule: !channelBlocked && (status === "granted" || status === "provisional"),
    };
  }

  private async ensureChannel(): Promise<void> {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync(reminderChannelId, {
      name: this.channelName(),
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

  private async perform<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<NotificationResult<T>> {
    if (Platform.OS !== "ios" && Platform.OS !== "android")
      return failure("unsupported", operation);
    try {
      return { ok: true, value: await action() };
    } catch (cause) {
      return failure("unavailable", operation, cause);
    }
  }
}

export function configureReminderNotificationPresentation(): void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const present = isOwned(notification.request);
      return {
        shouldShowBanner: present,
        shouldShowList: present,
        shouldPlaySound: present,
        shouldSetBadge: false,
      };
    },
  });
}

function permissionStatus(
  permission: Notifications.NotificationPermissionsStatus,
): ReminderNotificationPermission["status"] {
  if (Platform.OS === "ios" && permission.ios) {
    switch (permission.ios.status) {
      case Notifications.IosAuthorizationStatus.AUTHORIZED:
      case Notifications.IosAuthorizationStatus.EPHEMERAL:
        return "granted";
      case Notifications.IosAuthorizationStatus.PROVISIONAL:
        return "provisional";
      case Notifications.IosAuthorizationStatus.DENIED:
        return "denied";
      default:
        return "undetermined";
    }
  }
  return permission.granted
    ? "granted"
    : permission.status === "denied"
      ? "denied"
      : "undetermined";
}

function isOwned(notification: Notifications.NotificationRequest): boolean {
  return (
    notification.identifier.startsWith("reminder:") && notification.content.data?.owner === owner
  );
}

function readRequest(
  notification: Notifications.NotificationRequest,
): ReminderNotificationRequest | null {
  const data = notification.content.data;
  if (!data || data.version !== 1) return null;
  const request = {
    vehicleId: data.vehicleId,
    title: notification.content.title,
    body: notification.content.body,
    plan: {
      key: data.key,
      reminderId: data.reminderId,
      fireAt: data.fireAt,
      daysBefore: data.daysBefore,
    },
  } as ReminderNotificationRequest;
  return validRequest(request) && request.plan.key === notification.identifier ? request : null;
}

function validRequest(request: ReminderNotificationRequest): boolean {
  const plan = request.plan;
  return (
    !!plan &&
    typeof request.vehicleId === "string" &&
    isUuidV7(request.vehicleId) &&
    typeof plan.reminderId === "string" &&
    isUuidV7(plan.reminderId) &&
    (plan.daysBefore === 7 || plan.daysBefore === 1 || plan.daysBefore === 0) &&
    plan.key === `reminder:${plan.reminderId}:${plan.daysBefore}` &&
    typeof plan.fireAt === "string" &&
    utcTimestamp(plan.fireAt, "fireAt").ok &&
    typeof request.title === "string" &&
    request.title.trim().length > 0 &&
    typeof request.body === "string" &&
    request.body.trim().length > 0
  );
}

function failure(
  kind: "unsupported" | "unavailable" | "permission-denied" | "invalid-request",
  operation: string,
  cause?: unknown,
): NotificationResult<never> {
  return { ok: false, error: { kind, operation, cause } };
}
