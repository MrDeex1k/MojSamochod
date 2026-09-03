import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import {
  createReminder,
  updateReminder,
  type CreateReminderInput,
  type EditReminderInput,
  type Reminder,
} from "@/domain/reminders/reminder";
import type { ReminderId, VehicleId } from "@/domain/shared/identifiers";
import type { Clock, IdGenerator } from "@/domain/shared/ports";

export class ReminderService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly repository: ReminderRepository,
  ) {}

  async create(input: CreateReminderInput): Promise<RepositoryResult<Reminder>> {
    const reminder = createReminder(input, { clock: this.clock, idGenerator: this.idGenerator });
    if (!reminder.ok) return repositoryFailure("unsupported", "reminder.create", reminder.issues);
    const existing = await this.repository.list(input.vehicleId);
    if (!existing.ok) return existing;
    if (existing.value.some((item) => item.kind === reminder.value.kind)) {
      return repositoryFailure("conflict", "reminder.create");
    }
    // The repository also enforces uniqueness atomically; this preflight is not a lock.
    const result = await this.repository.create(reminder.value);
    return result.ok ? repositorySuccess(reminder.value) : result;
  }

  async update(
    vehicleId: VehicleId,
    id: ReminderId,
    input: EditReminderInput,
  ): Promise<RepositoryResult<Reminder>> {
    const stored = await this.repository.get(vehicleId, id);
    if (!stored.ok) return stored;
    if (!stored.value) return repositoryFailure("not-found", "reminder.update");
    const reminder = updateReminder(stored.value, input, this.clock);
    if (!reminder.ok) return repositoryFailure("unsupported", "reminder.update", reminder.issues);
    const result = await this.repository.update(reminder.value);
    return result.ok ? repositorySuccess(reminder.value) : result;
  }

  get(vehicleId: VehicleId, id: ReminderId): Promise<RepositoryResult<Reminder | null>> {
    return this.repository.get(vehicleId, id);
  }

  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Reminder[]>> {
    return this.repository.list(vehicleId);
  }

  delete(vehicleId: VehicleId, id: ReminderId): Promise<RepositoryResult<void>> {
    return this.repository.delete(vehicleId, id);
  }
}
