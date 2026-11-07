const mockFinish = jest.fn();
jest.mock("@/infrastructure/storage/local-erase-data-storage", () => ({
  LocalEraseDataStorage: class {
    async begin() {}
    async isPending() {
      return false;
    }
    async clearDatabase() {}
    async clearFiles() {}
    async finish() {
      mockFinish();
    }
  },
}));
import { createApplicationServices } from "./application-services";
import { NativeReminderNotifications } from "./notifications/native-reminder-notifications";
import { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import type { AppDatabase } from "./database/database";

it("waits for scheduling before clearing both scheduled and delivered notifications", async () => {
  let finish!: (value: Awaited<ReturnType<ReminderSchedule["reconcile"]>>) => void;
  const pending = new Promise<Awaited<ReturnType<ReminderSchedule["reconcile"]>>>((resolve) => {
    finish = resolve;
  });
  jest.spyOn(ReminderSchedule.prototype, "reconcile").mockReturnValue(pending);
  const clear = jest
    .spyOn(NativeReminderNotifications.prototype, "clearOwned")
    .mockResolvedValue(undefined);
  const instance = createApplicationServices({} as AppDatabase);
  const erasing = instance.services.eraseData.erase();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(clear).not.toHaveBeenCalled();
  finish({ ok: true, cancelled: 0, scheduled: 0, unchanged: 0, permission: null, issues: [] });
  expect((await erasing).ok).toBe(true);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(mockFinish).toHaveBeenCalledTimes(1);
  await instance.runtime.stop();
});
it("does not complete erasure when delivered notifications cannot be cleared", async () => {
  jest.spyOn(ReminderSchedule.prototype, "reconcile").mockResolvedValue({
    ok: true,
    cancelled: 0,
    scheduled: 0,
    unchanged: 0,
    permission: null,
    issues: [],
  });
  jest
    .spyOn(NativeReminderNotifications.prototype, "clearOwned")
    .mockRejectedValue(new Error("native error"));
  const instance = createApplicationServices({} as AppDatabase);
  expect((await instance.services.eraseData.erase()).ok).toBe(false);
  expect(mockFinish).not.toHaveBeenCalled();
  await instance.runtime.stop();
});
