import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import type { ReminderSchedule } from "./reminder-schedule";

export function scheduleAwareReminderRepository(
  repository: ReminderRepository,
  schedule: ReminderSchedule,
): ReminderRepository {
  return {
    create: (value) => afterCommit(repository.create(value), schedule),
    update: (value) => afterCommit(repository.update(value), schedule),
    delete: (vehicleId, id) => afterCommit(repository.delete(vehicleId, id), schedule),
    get: (vehicleId, id) => repository.get(vehicleId, id),
    list: (vehicleId) => repository.list(vehicleId),
  };
}

export function scheduleAwareVehicleRepository(
  repository: VehicleRepository,
  schedule: ReminderSchedule,
): VehicleRepository {
  return {
    create: (value) => afterCommit(repository.create(value), schedule),
    update: (value) => afterCommit(repository.update(value), schedule),
    delete: (id) => afterCommit(repository.delete(id), schedule),
    get: () => repository.get(),
  };
}

async function afterCommit<T>(
  operation: Promise<RepositoryResult<T>>,
  schedule: ReminderSchedule,
): Promise<RepositoryResult<T>> {
  const result = await operation;
  if (result.ok) void schedule.reconcile();
  return result;
}
