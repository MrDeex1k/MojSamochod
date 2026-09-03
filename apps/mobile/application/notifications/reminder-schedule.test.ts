import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import { repositoryFailure } from "@/application/repositories/repository-result";
import { createDevelopmentVehicleHistoryFixture } from "@/development/fixtures/vehicle-history";
import { createReminder } from "@/domain/reminders/reminder";
import type { Reminder } from "@/domain/reminders/reminder";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type {
  ReminderNotifications,
  ScheduledReminderNotification,
} from "./reminder-notifications";
import { ReminderSchedule } from "./reminder-schedule";
import {
  scheduleAwareReminderRepository,
  scheduleAwareVehicleRepository,
} from "./schedule-aware-repositories";

const vehicle = createDevelopmentVehicleHistoryFixture().vehicle;
function repositorySuccess<T>(value: T) {
  return { ok: true as const, value };
}
const clock = { now: () => new Date("2026-09-03T10:00:00.000Z") };
const created = createReminder(
  { vehicleId: vehicle.id, kind: "insurance", dueDate: "2026-12-01", timeZone: "Europe/Warsaw" },
  {
    clock,
    idGenerator: { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" },
  },
);
if (!created.ok) throw new Error("Invalid reminder fixture");
const reminder = created.value;
const unavailable = {
  ok: false as const,
  error: { kind: "unavailable" as const, operation: "test" },
};
const granted = {
  status: "granted" as const,
  canAskAgain: true,
  channelBlocked: false,
  canSchedule: true,
};

function setup() {
  const state: {
    vehicle: Vehicle | null;
    reminders: readonly Reminder[];
    pending: ScheduledReminderNotification[];
    language: string;
  } = {
    vehicle,
    reminders: [reminder],
    pending: [],
    language: "en",
  };
  const vehicles: jest.Mocked<VehicleRepository> = {
    get: jest.fn(async () => repositorySuccess(state.vehicle)),
    create: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    update: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    delete: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
  };
  const reminders: jest.Mocked<ReminderRepository> = {
    list: jest.fn().mockImplementation(async () => repositorySuccess(state.reminders)),
    get: jest.fn().mockResolvedValue(repositorySuccess(reminder)),
    create: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    update: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    delete: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
  };
  const notifications: jest.Mocked<ReminderNotifications> = {
    getPermission: jest.fn().mockResolvedValue(repositorySuccess(granted)),
    requestPermissionAfterExplanation: jest.fn(),
    openSettings: jest.fn(),
    list: jest.fn(async () => repositorySuccess([...state.pending])),
    cancel: jest.fn().mockImplementation(async (identifier: string) => {
      state.pending = state.pending.filter((item) => item.identifier !== identifier);
      return repositorySuccess(undefined);
    }),
    schedule: jest
      .fn()
      .mockImplementation(async (request: Parameters<ReminderNotifications["schedule"]>[0]) => {
        state.pending.push({ identifier: request.plan.key, request });
        return repositorySuccess(request.plan.key);
      }),
  };
  const schedule = new ReminderSchedule(clock, vehicles, reminders, notifications, () => ({
    title: state.language,
    body: state.vehicle?.make ?? "",
  }));
  return { state, vehicles, reminders, notifications, schedule };
}

describe("reminder schedule reconciliation", () => {
  it("publishes completed snapshots and removes UI subscriptions", async () => {
    const { schedule } = setup();
    const listener = jest.fn();
    const unsubscribe = schedule.subscribe(listener);
    expect(schedule.getSnapshot()).toBeNull();
    const result = await schedule.reconcile();
    expect(schedule.getSnapshot()).toBe(result);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await schedule.reconcile();
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("is idempotent and recovers native state after restarting the coordinator", async () => {
    const { schedule, notifications, state, vehicles, reminders } = setup();
    expect(schedule.getLastResult()).toBeNull();
    expect(await schedule.reconcile()).toMatchObject({ ok: true, scheduled: 3 });
    const restarted = new ReminderSchedule(clock, vehicles, reminders, notifications, () => ({
      title: state.language,
      body: vehicle.make,
    }));
    const result = await restarted.reconcile();
    expect(result).toMatchObject({ ok: true, scheduled: 0, cancelled: 0, unchanged: 3 });
    expect(restarted.getLastResult()).toBe(result);
    expect(notifications.schedule).toHaveBeenCalledTimes(3);
    expect(notifications.requestPermissionAfterExplanation).not.toHaveBeenCalled();
  });

  it("replaces changed dates and refreshes localized vehicle content", async () => {
    const { schedule, state } = setup();
    await schedule.reconcile();
    state.reminders = [{ ...reminder, dueDate: "2026-12-02" as Reminder["dueDate"] }];
    expect(await schedule.reconcile()).toMatchObject({ ok: true, cancelled: 3, scheduled: 3 });
    expect(state.pending.every((item) => item.request?.plan.fireAt.includes("08:00:00"))).toBe(
      true,
    );
    state.language = "pl";
    state.vehicle = { ...vehicle, make: "Ford" };
    expect(await schedule.reconcile()).toMatchObject({ cancelled: 3, scheduled: 3 });
    expect(state.pending[0]?.request).toMatchObject({ title: "pl", body: "Ford" });
  });

  it.each(["reminder", "vehicle", "offsets", "overdue"] as const)(
    "removes obsolete alerts after %s changes",
    async (change) => {
      const { schedule, state } = setup();
      await schedule.reconcile();
      if (change === "reminder") state.reminders = [];
      if (change === "vehicle") state.vehicle = null;
      if (change === "offsets") state.reminders = [{ ...reminder, notificationDaysBefore: [] }];
      if (change === "overdue")
        state.reminders = [{ ...reminder, dueDate: "2026-01-01" as Reminder["dueDate"] }];
      expect(await schedule.reconcile()).toMatchObject({ ok: true, cancelled: 3, scheduled: 0 });
      expect(state.pending).toEqual([]);
    },
  );

  it("keeps matching offsets while adding only missing ones", async () => {
    const { schedule, state } = setup();
    state.reminders = [{ ...reminder, notificationDaysBefore: [0] }];
    await schedule.reconcile();
    state.reminders = [reminder];
    expect(await schedule.reconcile()).toMatchObject({
      ok: true,
      unchanged: 1,
      scheduled: 2,
      cancelled: 0,
    });
  });

  it("cancels on denial and rebuilds on restoration without changing stored reminders", async () => {
    const { schedule, notifications, state, reminders } = setup();
    await schedule.reconcile();
    notifications.getPermission.mockResolvedValueOnce(
      repositorySuccess({ ...granted, status: "denied", canSchedule: false }),
    );
    expect(await schedule.reconcile()).toMatchObject({ cancelled: 3, scheduled: 0 });
    expect(await schedule.reconcile()).toMatchObject({ scheduled: 3 });
    expect(state.reminders).toEqual([reminder]);
    expect(reminders.update).not.toHaveBeenCalled();
  });

  it.each(["vehicle", "reminders", "permission", "list", "plan"] as const)(
    "preserves native state after a %s read/validation failure",
    async (failure) => {
      const { schedule, notifications, vehicles, reminders, state } = setup();
      await schedule.reconcile();
      if (failure === "vehicle")
        vehicles.get.mockResolvedValueOnce(repositoryFailure("unavailable", "get"));
      if (failure === "reminders")
        reminders.list.mockResolvedValueOnce(repositoryFailure("corrupt-data", "list"));
      if (failure === "permission") notifications.getPermission.mockResolvedValueOnce(unavailable);
      if (failure === "list") notifications.list.mockResolvedValueOnce(unavailable);
      if (failure === "plan")
        state.reminders = [{ ...reminder, timeZone: "invalid" as Reminder["timeZone"] }];
      expect(await schedule.reconcile()).toMatchObject({ ok: false, cancelled: 0, scheduled: 0 });
      expect(state.pending).toHaveLength(3);
      expect(notifications.cancel).not.toHaveBeenCalled();
    },
  );

  it("does not schedule replacements after uncertain cancellation and retries from actual state", async () => {
    const { schedule, notifications, state } = setup();
    await schedule.reconcile();
    state.language = "pl";
    notifications.cancel.mockResolvedValueOnce(unavailable);
    expect(await schedule.reconcile()).toMatchObject({
      ok: false,
      scheduled: 0,
      cancelled: 2,
      issues: [{ stage: "cancel" }],
    });
    expect(await schedule.reconcile()).toMatchObject({ ok: true, cancelled: 1, scheduled: 3 });
    expect(state.pending).toHaveLength(3);
  });

  it.each([false, true])(
    "recovers a failed schedule even if the platform registered it: %s",
    async (registered) => {
      const { schedule, notifications, state } = setup();
      notifications.schedule.mockImplementationOnce(async (request) => {
        if (registered) state.pending.push({ identifier: request.plan.key, request });
        return unavailable;
      });
      expect(await schedule.reconcile()).toMatchObject({
        ok: false,
        issues: [{ stage: "schedule" }],
      });
      expect(await schedule.reconcile()).toMatchObject({ ok: true, scheduled: registered ? 0 : 1 });
      expect(state.pending).toHaveLength(3);
      expect(new Set(state.pending.map((item) => item.identifier)).size).toBe(3);
    },
  );

  it("cleans malformed and duplicate owned entries before replacing them", async () => {
    const { schedule, state } = setup();
    await schedule.reconcile();
    state.pending.push(state.pending[0]!, { identifier: "reminder:obsolete", request: null });
    expect(await schedule.reconcile()).toMatchObject({
      ok: true,
      cancelled: 2,
      scheduled: 1,
      unchanged: 2,
    });
    expect(state.pending).toHaveLength(3);
  });

  it("serializes concurrent passes and re-reads a deletion made during native scheduling", async () => {
    const { schedule, notifications, state } = setup();
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    notifications.schedule.mockImplementationOnce(async (request) => {
      entered();
      await gate;
      state.pending.push({ identifier: request.plan.key, request });
      return repositorySuccess(request.plan.key);
    });
    const first = schedule.reconcile();
    await started;
    state.vehicle = null;
    const second = schedule.reconcile();
    expect(notifications.list).toHaveBeenCalledTimes(1);
    release();
    await first;
    expect(await second).toMatchObject({ ok: true, cancelled: 3, scheduled: 0 });
    expect(state.pending).toEqual([]);
  });

  it("does not poison the queue after an unexpected native rejection", async () => {
    const { schedule, notifications } = setup();
    notifications.list.mockRejectedValueOnce(new Error("native failure"));
    expect(await schedule.reconcile()).toMatchObject({
      ok: false,
      issues: [{ stage: "unexpected" }],
    });
    expect(await schedule.reconcile()).toMatchObject({ ok: true, scheduled: 3 });
  });
});

describe("schedule-aware repository commit boundaries", () => {
  it("refreshes after each successful write, not after reads or failed writes", async () => {
    const { schedule, reminders, vehicles } = setup();
    const refresh = jest
      .spyOn(schedule, "reconcile")
      .mockImplementation(() => new Promise(() => {}));
    const wrappedReminders = scheduleAwareReminderRepository(reminders, schedule);
    const wrappedVehicles = scheduleAwareVehicleRepository(vehicles, schedule);
    await wrappedReminders.get(vehicle.id, reminder.id);
    await wrappedReminders.list(vehicle.id);
    await wrappedVehicles.get();
    expect(refresh).not.toHaveBeenCalled();
    const failure = repositoryFailure("unavailable", "update");
    reminders.update.mockResolvedValueOnce(failure);
    vehicles.update.mockResolvedValueOnce(failure);
    expect(await wrappedReminders.update(reminder)).toBe(failure);
    expect(await wrappedVehicles.update(vehicle)).toBe(failure);
    expect(refresh).not.toHaveBeenCalled();
    await wrappedReminders.create(reminder);
    await wrappedReminders.update(reminder);
    await wrappedReminders.delete(vehicle.id, reminder.id);
    await wrappedVehicles.create(vehicle);
    await wrappedVehicles.update(vehicle);
    await wrappedVehicles.delete(vehicle.id);
    // A pending native operation must not delay committed data becoming available to the UI.
    expect(refresh).toHaveBeenCalledTimes(6);
  });
});
