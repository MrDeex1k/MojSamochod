import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { createReminder } from "@/domain/reminders/reminder";
import { planReminderNotifications } from "@/domain/reminders/notification-plan";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import type { ReminderNotificationRequest } from "@/application/notifications/reminder-notifications";
import {
  configureReminderNotificationPresentation,
  NativeReminderNotifications,
  reminderChannelId,
} from "./native-reminder-notifications";

jest.mock("expo-notifications", () => ({
  AndroidImportance: { NONE: 0, DEFAULT: 3 },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  SchedulableTriggerInputTypes: { DATE: "date" },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getNotificationChannelAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

const native = jest.mocked(Notifications);
const now = new Date("2026-09-03T10:00:00.000Z");
const clock = { now: () => now };

beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "ios");
  native.getPermissionsAsync.mockResolvedValue(permission());
  native.requestPermissionsAsync.mockResolvedValue(permission());
  native.getNotificationChannelAsync.mockResolvedValue(null);
  native.setNotificationChannelAsync.mockResolvedValue(null);
  native.scheduleNotificationAsync.mockImplementation(async (request) => request.identifier!);
  native.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  native.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

describe("Native reminder permissions", () => {
  it("notifies reconciliation once after an explicit coalesced permission request", async () => {
    const changed = jest.fn();
    const adapter = new NativeReminderNotifications(clock, () => "Reminders", changed);
    await adapter.getPermission();
    expect(changed).not.toHaveBeenCalled();
    await Promise.all([
      adapter.requestPermissionAfterExplanation(),
      adapter.requestPermissionAfterExplanation(),
    ]);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("refreshes actual permission state even when the explicit request fails", async () => {
    const changed = jest.fn();
    native.getPermissionsAsync.mockRejectedValueOnce(new Error("native failure"));
    const adapter = new NativeReminderNotifications(clock, () => "Reminders", changed);
    expect(await adapter.requestPermissionAfterExplanation()).toMatchObject({ ok: false });
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("does not ask permission or create a channel when constructed or queried", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const adapter = notifications();
    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
    expect(await adapter.getPermission()).toEqual({
      ok: true,
      value: { status: "granted", canAskAgain: true, channelBlocked: false, canSchedule: true },
    });
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(native.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it.each([
    [Notifications.IosAuthorizationStatus.NOT_DETERMINED, "undetermined", false],
    [Notifications.IosAuthorizationStatus.DENIED, "denied", false],
    [Notifications.IosAuthorizationStatus.AUTHORIZED, "granted", true],
    [Notifications.IosAuthorizationStatus.PROVISIONAL, "provisional", true],
    [Notifications.IosAuthorizationStatus.EPHEMERAL, "granted", true],
  ])(
    "uses iOS authorization state %s instead of the top-level granted flag",
    async (status, expected, canSchedule) => {
      native.getPermissionsAsync.mockResolvedValue(permission({ granted: false, ios: { status } }));
      expect(await notifications().getPermission()).toMatchObject({
        value: { status: expected, canSchedule },
      });
    },
  );

  it("recognizes a disabled Android channel without asking permission", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    native.getNotificationChannelAsync.mockResolvedValue({
      importance: Notifications.AndroidImportance.NONE,
    } as Notifications.NotificationChannel);
    expect(await notifications().getPermission()).toMatchObject({
      value: { channelBlocked: true, canSchedule: false },
    });
    expect(await notifications().schedule(request())).toMatchObject({
      error: { kind: "permission-denied" },
    });
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("creates the Android channel before an explicit permission prompt, and coalesces requests", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    native.getPermissionsAsync
      .mockResolvedValueOnce(permission({ granted: false, status: "undetermined" }))
      .mockResolvedValueOnce(permission());
    const adapter = notifications();
    const first = adapter.requestPermissionAfterExplanation();
    const second = adapter.requestPermissionAfterExplanation();
    expect(second).toBe(first);
    expect(await first).toMatchObject({ value: { canSchedule: true } });
    expect(native.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(native.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      native.requestPermissionsAsync.mock.invocationCallOrder[0]!,
    );
    expect(native.setNotificationChannelAsync).toHaveBeenCalledWith(reminderChannelId, {
      name: "Vehicle reminders",
      importance: 3,
      sound: "default",
    });
  });

  it("asks for iOS alerts and sound but not badges or provisional authorization", async () => {
    native.getPermissionsAsync
      .mockResolvedValueOnce(permission({ granted: false, status: "undetermined" }))
      .mockResolvedValueOnce(permission({ granted: false, status: "denied", canAskAgain: false }));
    expect(await notifications().requestPermissionAfterExplanation()).toMatchObject({
      value: { status: "denied", canSchedule: false },
    });
    expect(native.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    expect(native.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it.each([
    { granted: false, status: "denied", canAskAgain: false },
    { granted: true, status: "granted" },
    { granted: false, ios: { status: Notifications.IosAuthorizationStatus.PROVISIONAL } },
  ])(
    "does not repeatedly prompt when settings already decide the outcome: %j",
    async (settings) => {
      native.getPermissionsAsync.mockResolvedValue(permission(settings));
      await notifications().requestPermissionAfterExplanation();
      expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    },
  );

  it("reports permission-query failure and permits a later retry", async () => {
    native.getPermissionsAsync.mockRejectedValueOnce(new Error("native unavailable"));
    const adapter = notifications();
    expect(await adapter.requestPermissionAfterExplanation()).toMatchObject({
      error: { kind: "unavailable" },
    });
    expect(await adapter.requestPermissionAfterExplanation()).toMatchObject({ ok: true });
  });

  it("opens system settings only when explicitly asked", async () => {
    const open = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    expect(await notifications().openSettings()).toEqual({ ok: true, value: undefined });
    expect(open).toHaveBeenCalledTimes(1);
    open.mockRejectedValueOnce(new Error("unavailable"));
    expect(await notifications().openSettings()).toMatchObject({ error: { kind: "unavailable" } });
  });
});

describe("Native reminder scheduling", () => {
  it.each(["ios", "android"] as const)(
    "uses a one-shot absolute instant on %s without requesting permission",
    async (platform) => {
      jest.replaceProperty(Platform, "OS", platform);
      const input = request();
      expect(await notifications().schedule(input)).toEqual({ ok: true, value: input.plan.key });
      expect(native.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: input.plan.key,
        content: {
          title: input.title,
          body: input.body,
          sound: "default",
          data: {
            owner: "moje-auto-reminders",
            version: 1,
            vehicleId: input.vehicleId,
            ...input.plan,
          },
        },
        trigger: {
          type: "date",
          date: new Date("2026-11-24T08:00:00.000Z"),
          ...(platform === "android" ? { channelId: reminderChannelId } : {}),
        },
      });
      expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    },
  );

  it("does not schedule after denied or revoked permission", async () => {
    native.getPermissionsAsync
      .mockResolvedValueOnce(permission())
      .mockResolvedValueOnce(permission({ granted: false, status: "denied" }));
    expect(await notifications().schedule(request())).toMatchObject({
      error: { kind: "permission-denied" },
    });
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("rechecks the clock after permission/channel work so elapsed dates never become immediate alerts", async () => {
    const adapter = new NativeReminderNotifications(
      { now: () => new Date(request().plan.fireAt) },
      () => "Reminders",
    );
    expect(await adapter.schedule(request())).toMatchObject({ error: { kind: "invalid-request" } });
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("rejects malformed plans and empty content before accessing native APIs", async () => {
    for (const input of [
      { ...request(), title: " " },
      { ...request(), plan: { ...request().plan, key: "unrelated" } },
      { ...request(), plan: { ...request().plan, fireAt: "not-a-date" } },
    ]) {
      expect(await notifications().schedule(input as ReminderNotificationRequest)).toMatchObject({
        error: { kind: "invalid-request" },
      });
    }
    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("propagates scheduling and channel failures", async () => {
    native.scheduleNotificationAsync.mockRejectedValueOnce(new Error("storage full"));
    expect(await notifications().schedule(request())).toMatchObject({
      error: { kind: "unavailable" },
    });
    jest.replaceProperty(Platform, "OS", "android");
    native.setNotificationChannelAsync.mockRejectedValueOnce(new Error("channel error"));
    expect(await notifications().schedule(request())).toMatchObject({
      error: { kind: "unavailable" },
    });
  });

  it("lists only owned notifications, retaining malformed metadata for later cleanup", async () => {
    const adapter = notifications();
    await adapter.schedule(request());
    const scheduled = native.scheduleNotificationAsync.mock.calls[0]![0];
    native.getAllScheduledNotificationsAsync.mockResolvedValue([
      scheduled,
      { ...scheduled, identifier: "unrelated" },
      {
        ...scheduled,
        content: { ...scheduled.content, data: { ...scheduled.content.data, version: 99 } },
      },
    ] as Notifications.NotificationRequest[]);
    expect(await adapter.list()).toEqual({
      ok: true,
      value: [
        { identifier: request().plan.key, request: request() },
        { identifier: request().plan.key, request: null },
      ],
    });
  });

  it("cancels only the reserved identifier namespace without querying permissions", async () => {
    expect(await notifications().cancel("other-feature")).toMatchObject({
      error: { kind: "invalid-request" },
    });
    expect(native.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(await notifications().cancel(request().plan.key)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledWith(request().plan.key);
    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("propagates native list and cancellation failures", async () => {
    native.getAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error("unavailable"));
    native.cancelScheduledNotificationAsync.mockRejectedValueOnce(new Error("unavailable"));
    expect(await notifications().list()).toMatchObject({ error: { kind: "unavailable" } });
    expect(await notifications().cancel(request().plan.key)).toMatchObject({
      error: { kind: "unavailable" },
    });
  });

  it("does not touch native notification APIs on unsupported platforms", async () => {
    jest.replaceProperty(Platform, "OS", "web");
    const adapter = notifications();
    for (const result of await Promise.all([
      adapter.getPermission(),
      adapter.requestPermissionAfterExplanation(),
      adapter.list(),
      adapter.schedule(request()),
      adapter.cancel(request().plan.key),
      adapter.openSettings(),
    ])) {
      expect(result).toMatchObject({ error: { kind: "unsupported" } });
    }
    configureReminderNotificationPresentation();
    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
    expect(native.setNotificationHandler).not.toHaveBeenCalled();
    expect(native.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("installs foreground presentation without prompting or scheduling", async () => {
    configureReminderNotificationPresentation();
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    const handler = native.setNotificationHandler.mock.calls[0]![0]!;
    const notification = {
      date: now.getTime(),
      request: {
        identifier: request().plan.key,
        content: { data: { owner: "moje-auto-reminders" } },
      },
    } as unknown as Notifications.Notification;
    expect(await handler.handleNotification(notification)).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
    expect(
      await handler.handleNotification({
        ...notification,
        request: { ...notification.request, identifier: "unrelated" },
      }),
    ).toMatchObject({ shouldShowBanner: false, shouldShowList: false });
  });
});

function notifications() {
  return new NativeReminderNotifications(clock, () => "Vehicle reminders");
}

function permission(
  patch: Record<string, unknown> = {},
): Notifications.NotificationPermissionsStatus {
  return {
    status: "granted",
    granted: true,
    canAskAgain: true,
    expires: "never",
    ...patch,
  } as Notifications.NotificationPermissionsStatus;
}

function request(): ReminderNotificationRequest {
  const reminder = createReminder(
    {
      dueDate: "2026-12-01",
      kind: "insurance",
      timeZone: "Europe/Warsaw",
      vehicleId: vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f"),
    },
    { clock, idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" } },
  );
  if (!reminder.ok) throw new Error("Invalid fixture");
  const plan = planReminderNotifications(reminder.value, now);
  if (!plan.ok) throw new Error("Invalid fixture");
  return {
    plan: plan.value[0]!,
    vehicleId: reminder.value.vehicleId,
    title: "Insurance",
    body: "Valid until 2026-12-01",
  };
}
