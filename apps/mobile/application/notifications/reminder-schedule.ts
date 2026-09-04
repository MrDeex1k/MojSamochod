import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import { planReminderNotifications } from "@/domain/reminders/notification-plan";
import type { Reminder } from "@/domain/reminders/reminder";
import type { Clock } from "@/domain/shared/ports";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type {
  ReminderNotificationPermission,
  ReminderNotificationRequest,
  ReminderNotifications,
} from "./reminder-notifications";

export type ReconciliationIssue = Readonly<{
  stage: "data" | "permission" | "list" | "plan" | "cancel" | "schedule" | "unexpected";
  cause: unknown;
  identifier?: string;
}>;

export type ReconciliationResult = Readonly<{
  ok: boolean;
  cancelled: number;
  scheduled: number;
  unchanged: number;
  permission: ReminderNotificationPermission | null;
  issues: readonly ReconciliationIssue[];
}>;

type NotificationContent = (
  reminder: Reminder,
  vehicle: Vehicle,
) => Pick<ReminderNotificationRequest, "title" | "body">;

export class ReminderSchedule {
  private tail: Promise<void> = Promise.resolve();
  private lastResult: ReconciliationResult | null = null;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ReconciliationResult | null => this.lastResult;

  constructor(
    private readonly clock: Clock,
    private readonly vehicles: VehicleRepository,
    private readonly reminders: ReminderRepository,
    private readonly notifications: ReminderNotifications,
    private readonly content: NotificationContent,
  ) {}

  getLastResult(): ReconciliationResult | null {
    return this.lastResult;
  }

  reconcile(): Promise<ReconciliationResult> {
    // Each request reads a fresh snapshot after the preceding pass, including requests arriving
    // during a native await. There is no overlapping cancel/schedule sequence or lost dirty flag.
    const next = this.tail.then(async () => {
      const result = await this.runSafely();
      this.lastResult = result;
      for (const listener of this.listeners) {
        try {
          listener();
        } catch {
          // A subscriber cannot invalidate native work or prevent other subscribers updating.
        }
      }
      return result;
    });
    // Keep the serial queue usable even if a pass unexpectedly rejects; callers retain its result.
    this.tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  private async runSafely(): Promise<ReconciliationResult> {
    const progress = { cancelled: 0, scheduled: 0, unchanged: 0 };
    let permission: ReminderNotificationPermission | null = null;
    const issues: ReconciliationIssue[] = [];
    const finish = (): ReconciliationResult => ({
      ...progress,
      permission,
      issues,
      ok: issues.length === 0,
    });
    try {
      const vehicle = await this.vehicles.get();
      if (!vehicle.ok) {
        issues.push({ stage: "data", cause: vehicle.error });
        return finish();
      }
      const records = vehicle.value
        ? await this.reminders.list(vehicle.value.id)
        : { ok: true as const, value: [] };
      if (!records.ok) {
        issues.push({ stage: "data", cause: records.error });
        return finish();
      }
      const access = await this.notifications.getPermission();
      if (!access.ok) {
        issues.push({ stage: "permission", cause: access.error });
        return finish();
      }
      permission = access.value;

      const desired = new Map<string, ReminderNotificationRequest>();
      if (permission.canSchedule && vehicle.value) {
        for (const reminder of records.value) {
          if (reminder.vehicleId !== vehicle.value.id) {
            issues.push({ stage: "data", cause: "Reminder owner does not match vehicle" });
            return finish();
          }
          const plan = planReminderNotifications(reminder, this.clock.now());
          if (!plan.ok) {
            issues.push({ stage: "plan", cause: plan.issues });
            return finish();
          }
          const content = this.content(reminder, vehicle.value);
          for (const item of plan.value)
            desired.set(item.key, { plan: item, vehicleId: vehicle.value.id, ...content });
        }
      }

      const pending = await this.notifications.list();
      if (!pending.ok) {
        issues.push({ stage: "list", cause: pending.error });
        return finish();
      }
      const counts = new Map<string, number>();
      for (const item of pending.value)
        counts.set(item.identifier, (counts.get(item.identifier) ?? 0) + 1);
      const cancelled = new Set<string>();
      for (const item of pending.value) {
        if (cancelled.has(item.identifier)) continue;
        const expected = desired.get(item.identifier);
        if (
          expected &&
          item.request &&
          counts.get(item.identifier) === 1 &&
          sameRequest(item.request, expected)
        ) {
          desired.delete(item.identifier);
          progress.unchanged += 1;
          continue;
        }
        const result = await this.notifications.cancel(item.identifier);
        cancelled.add(item.identifier);
        if (result.ok) progress.cancelled += 1;
        else issues.push({ stage: "cancel", cause: result.error, identifier: item.identifier });
      }
      // Never add replacements when removal of an old alert is uncertain.
      if (issues.length > 0) return finish();
      for (const request of desired.values()) {
        if (Date.parse(request.plan.fireAt) <= this.clock.now().getTime()) continue;
        const result = await this.notifications.schedule(request);
        if (result.ok) progress.scheduled += 1;
        else issues.push({ stage: "schedule", cause: result.error, identifier: request.plan.key });
      }
      return finish();
    } catch (cause) {
      issues.push({ stage: "unexpected", cause });
      return finish();
    }
  }
}

function sameRequest(
  left: ReminderNotificationRequest,
  right: ReminderNotificationRequest,
): boolean {
  return (
    left.vehicleId === right.vehicleId &&
    left.title === right.title &&
    left.body === right.body &&
    left.plan.key === right.plan.key &&
    left.plan.reminderId === right.plan.reminderId &&
    left.plan.daysBefore === right.plan.daysBefore &&
    left.plan.fireAt === right.plan.fireAt
  );
}
