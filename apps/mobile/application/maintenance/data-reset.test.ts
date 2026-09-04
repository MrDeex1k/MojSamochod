import { DataReset, type DataResetDependencies } from "./data-reset";
import { DataAccess } from "./data-access";
import { repositorySuccess } from "@/application/repositories/repository-result";

function fixture() {
  let pending = false;
  const calls: string[] = [];
  const dependencies: DataResetDependencies = {
    store: {
      isPending: jest.fn(async () => pending),
      markPending: jest.fn(async () => {
        calls.push("mark");
        pending = true;
      }),
      eraseRecords: jest.fn(async () => {
        calls.push("records");
      }),
      finish: jest.fn(async () => {
        calls.push("finish");
        pending = false;
      }),
    },
    stopDataAccess: jest.fn(async () => {
      calls.push("data");
    }),
    stopScheduling: jest.fn(async () => {
      calls.push("schedule");
    }),
    cancelNotifications: jest.fn(async () => {
      calls.push("notifications");
    }),
    eraseFiles: jest.fn(async () => {
      calls.push("files");
    }),
  };
  return { dependencies, calls, reset: new DataReset(dependencies) };
}

it("never resets on normal startup without a persisted request", async () => {
  const { reset, calls } = fixture();
  expect(await reset.resumeIfPending()).toBe(false);
  expect(calls).toEqual([]);
});

it("drains work, persists intent and finishes only after all stores are empty", async () => {
  const { reset, calls } = fixture();
  await Promise.all([reset.erase(), reset.erase()]);
  expect(calls).toEqual([
    "data",
    "schedule",
    "mark",
    "notifications",
    "records",
    "files",
    "finish",
  ]);
  expect(await reset.resumeIfPending()).toBe(false);
});

it.each(["cancelNotifications", "eraseFiles"] as const)(
  "resumes after a failure in %s",
  async (stage) => {
    const { reset, dependencies } = fixture();
    jest.mocked(dependencies[stage]).mockRejectedValueOnce(new Error("interrupted"));
    await expect(reset.erase()).rejects.toThrow("interrupted");
    expect(await dependencies.store.isPending()).toBe(true);
    expect(dependencies.store.finish).not.toHaveBeenCalled();
    expect(await new DataReset(dependencies).resumeIfPending()).toBe(true);
    expect(await dependencies.store.isPending()).toBe(false);
  },
);

it("does not erase anything if the intent cannot be persisted", async () => {
  const { reset, dependencies } = fixture();
  jest.mocked(dependencies.store.markPending).mockRejectedValueOnce(new Error("SQLITE_FULL"));
  await expect(reset.erase()).rejects.toThrow("SQLITE_FULL");
  expect(dependencies.cancelNotifications).not.toHaveBeenCalled();
  expect(dependencies.store.eraseRecords).not.toHaveBeenCalled();
  expect(dependencies.eraseFiles).not.toHaveBeenCalled();
});

it("drains accepted writes and rejects stale callbacks after reset", async () => {
  const access = new DataAccess();
  let complete!: () => void;
  const wait = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const original = {
    save: jest.fn(async () => {
      await wait;
      return repositorySuccess(1);
    }),
  };
  const guarded = access.guard(original);
  expect(guarded.save).toBe(guarded.save);
  const save = guarded.save();
  let drained = false;
  const stop = access.stop().then(() => {
    drained = true;
  });
  await Promise.resolve();
  expect(drained).toBe(false);
  expect((await guarded.save()).ok).toBe(false);
  complete();
  await stop;
  expect(await save).toEqual(repositorySuccess(1));
  expect(original.save).toHaveBeenCalledTimes(1);
});
