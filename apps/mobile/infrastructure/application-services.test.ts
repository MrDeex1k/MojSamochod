const mockFinish = jest.fn();
jest.mock("@/infrastructure/storage/local-erase-data-storage", () => ({
  LocalEraseDataStorage: class {
    async runStage(_stage: string, work: () => Promise<void>) {
      await work();
    }
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
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  jest.spyOn(ReminderSchedule.prototype, "stop").mockReturnValue(pending);
  const clear = jest
    .spyOn(NativeReminderNotifications.prototype, "clearOwned")
    .mockResolvedValue(undefined);
  const instance = createApplicationServices({} as AppDatabase);
  let releaseImport!: () => void;
  const importing = instance.runtime.operations.track(
    () =>
      new Promise<void>((resolve) => {
        releaseImport = resolve;
      }),
  );
  const erasing = instance.services.eraseData.erase();
  await expect(instance.runtime.operations.track(async () => {})).rejects.toThrow();
  expect(ReminderSchedule.prototype.stop).not.toHaveBeenCalled();
  releaseImport();
  await importing;
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(clear).not.toHaveBeenCalled();
  finish();
  expect((await erasing).ok).toBe(true);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(mockFinish).toHaveBeenCalledTimes(1);
  await expect(instance.runtime.operations.track(async () => "new vehicle")).resolves.toBe(
    "new vehicle",
  );
  await instance.runtime.stop();
});
it("does not complete erasure when delivered notifications cannot be cleared", async () => {
  jest
    .spyOn(NativeReminderNotifications.prototype, "clearOwned")
    .mockRejectedValue(new Error("native error"));
  const instance = createApplicationServices({} as AppDatabase);
  expect((await instance.services.eraseData.erase()).ok).toBe(false);
  expect(mockFinish).not.toHaveBeenCalled();
  await instance.runtime.stop();
});
