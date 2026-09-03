import type { Reminder } from "@/domain/reminders/reminder";
import type { ReminderId, VehicleId } from "@/domain/shared/identifiers";
import type { RepositoryResult } from "./repository-result";

export interface ReminderRepository {
  create(reminder: Reminder): Promise<RepositoryResult<void>>;
  delete(vehicleId: VehicleId, reminderId: ReminderId): Promise<RepositoryResult<void>>;
  get(vehicleId: VehicleId, reminderId: ReminderId): Promise<RepositoryResult<Reminder | null>>;
  list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Reminder[]>>;
  update(reminder: Reminder): Promise<RepositoryResult<void>>;
}
