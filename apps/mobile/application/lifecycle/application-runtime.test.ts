import { ApplicationRuntime } from "./application-runtime";
import { DatabaseSession } from "./database-session";
import type { DatabaseHandle } from "@/infrastructure/database/database";
const success = { ok: true as const, value: undefined };
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it("does not schedule or expose data if pending erasure fails", async () => {
  const startSchedule = jest.fn();
  const recover = jest.fn();
  const runtime = new ApplicationRuntime({
    resume: async () => ({ ok: false, error: { kind: "unavailable", operation: "erase" } }),
    recover,
    startSchedule,
    stopSchedule: async () => {},
  });
  expect((await runtime.start(jest.fn())).ok).toBe(false);
  expect(recover).not.toHaveBeenCalled();
  expect(startSchedule).not.toHaveBeenCalled();
  expect(runtime.diagnostics[0]?.stage).toBe("recovery");
  await runtime.stop();
});
it("orders recovery, scheduling and readiness and preserves cleanup errors", async () => {
  const events: string[] = [];
  const runtime = new ApplicationRuntime({
    resume: async () => {
      events.push("erase");
      return success;
    },
    recover: async (ready) => {
      events.push("recover");
      ready();
      return { ok: false, error: { kind: "unavailable", operation: "cleanup" } };
    },
    startSchedule: () => {
      events.push("schedule");
      return () => {
        events.push("unsubscribe");
      };
    },
    stopSchedule: async () => {
      events.push("stop");
    },
  });
  await runtime.start(() => events.push("ready"));
  await runtime.stop();
  expect(events).toEqual(["erase", "recover", "schedule", "ready", "unsubscribe", "stop"]);
  expect(runtime.diagnostics[0]?.stage).toBe("cleanup");
});
it("drains accepted operations and recovery before stopping", async () => {
  const recovery = deferred(),
    operation = deferred();
  const stopSchedule = jest.fn(async () => {});
  const runtime = new ApplicationRuntime({
    resume: async () => success,
    recover: async (ready) => {
      await recovery.promise;
      ready();
      return success;
    },
    startSchedule: jest.fn(() => () => {}),
    stopSchedule,
  });
  const ready = jest.fn();
  const starting = runtime.start(ready);
  const work = runtime.operations.track(() => operation.promise);
  const stopping = runtime.stop();
  await expect(runtime.operations.track(async () => {})).rejects.toThrow();
  recovery.resolve();
  await starting;
  expect(ready).not.toHaveBeenCalled();
  expect(stopSchedule).not.toHaveBeenCalled();
  operation.resolve();
  await work;
  await stopping;
  expect(stopSchedule).toHaveBeenCalledTimes(1);
});
it("waits for service shutdown before closing and opening a replacement database", async () => {
  const gate = deferred();
  const events: string[] = [];
  const handle = {
    database: {},
    close: async () => {
      events.push("close");
    },
  } as DatabaseHandle;
  const first = new DatabaseSession(async () => handle);
  await first.open();
  await first.register(async () => {
    events.push("stopping");
    await gate.promise;
    events.push("stopped");
  });
  const closing = first.close();
  const second = new DatabaseSession(async () => {
    events.push("open");
    return handle;
  });
  const opening = second.open();
  await Promise.resolve();
  expect(events).toEqual(["stopping"]);
  gate.resolve();
  await closing;
  await opening;
  expect(events).toEqual(["stopping", "stopped", "close", "open"]);
  await second.close();
});
