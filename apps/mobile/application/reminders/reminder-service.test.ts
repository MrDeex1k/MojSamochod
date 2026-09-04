import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import { repositoryFailure, repositorySuccess } from "@/application/repositories/repository-result";
import { createReminder } from "@/domain/reminders/reminder";
import { vehicleIdFromUuidV7 } from "@/domain/shared/identifiers";
import { ReminderService } from "./reminder-service";

const input = {
  dueDate: "2026-12-01",
  kind: "insurance",
  timeZone: "Europe/Warsaw",
  vehicleId: vehicleIdFromUuidV7("018f47e2-7b2f-7cc8-98c4-dc0c0c07398f"),
};
const clock = { now: () => new Date("2026-09-03T10:00:00.000Z") };
const idGenerator = { generate: () => "018f47e2-7b35-7658-b336-34613389d00f" };
const created = createReminder(input, { clock, idGenerator });
if (!created.ok) throw new Error("Invalid fixture");
const reminder = created.value;

function setup() {
  const repository: jest.Mocked<ReminderRepository> = {
    create: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
    delete: jest.fn(),
    get: jest.fn().mockResolvedValue(repositorySuccess(reminder)),
    list: jest.fn().mockResolvedValue(repositorySuccess([])),
    update: jest.fn().mockResolvedValue(repositorySuccess(undefined)),
  };
  return { repository, service: new ReminderService(clock, idGenerator, repository) };
}

describe("ReminderService failure boundaries", () => {
  it("does not access storage for invalid creation input", async () => {
    const { repository, service } = setup();
    expect(await service.create({ ...input, timeZone: "invalid" })).toMatchObject({
      error: { kind: "unsupported" },
    });
    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("propagates list failures without attempting creation", async () => {
    const { repository, service } = setup();
    const failure = repositoryFailure("corrupt-data", "reminder.list");
    repository.list.mockResolvedValue(failure);
    expect(await service.create(input)).toBe(failure);
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("does not attempt creation when the kind already exists", async () => {
    const { repository, service } = setup();
    repository.list.mockResolvedValue(repositorySuccess([reminder]));
    expect(await service.create(input)).toMatchObject({ error: { kind: "conflict" } });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it.each(["conflict", "unavailable"] as const)(
    "propagates %s after a successful preflight",
    async (kind) => {
      const { repository, service } = setup();
      const failure = repositoryFailure(kind, "reminder.create");
      repository.create.mockResolvedValue(failure);
      expect(await service.create(input)).toBe(failure);
    },
  );
  it("propagates read failure and never writes an update", async () => {
    const { repository, service } = setup();
    const failure = repositoryFailure("unavailable", "reminder.get");
    repository.get.mockResolvedValue(failure);
    expect(
      await service.update(input.vehicleId, reminder.id, {
        dueDate: input.dueDate,
        notificationDaysBefore: [],
      }),
    ).toBe(failure);
    expect(repository.update).not.toHaveBeenCalled();
  });
  it("returns storage failure instead of claiming an edit was saved", async () => {
    const { repository, service } = setup();
    const failure = repositoryFailure("unavailable", "reminder.update");
    repository.update.mockResolvedValue(failure);
    expect(
      await service.update(input.vehicleId, reminder.id, {
        dueDate: input.dueDate,
        notificationDaysBefore: [],
      }),
    ).toBe(failure);
  });
});
