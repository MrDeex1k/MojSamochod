import { and, asc, eq } from "drizzle-orm";
import type { ReminderRepository } from "@/application/repositories/reminder-repository";
import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";
import type { Reminder } from "@/domain/reminders/reminder";
import type { ReminderId, VehicleId } from "@/domain/shared/identifiers";
import type { AppDatabase } from "./database";
import { mapReminderRow, reminderValues } from "./reminder-row-mapper";
import { CorruptStoredDataError } from "./row-mappers";
import { reminders, vehicles } from "./schema";

export class DrizzleReminderRepository implements ReminderRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(reminder: Reminder): Promise<RepositoryResult<void>> {
    const operation = "reminder.create";
    try {
      return this.database.transaction((transaction) => {
        const vehicle = transaction
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.id, reminder.vehicleId))
          .get();
        if (!vehicle) return repositoryFailure("not-found", operation);
        const result = transaction
          .insert(reminders)
          .values(reminderValues(reminder))
          .onConflictDoNothing()
          .run();
        return result.changes === 0
          ? repositoryFailure("conflict", operation)
          : repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async get(
    vehicleId: VehicleId,
    reminderId: ReminderId,
  ): Promise<RepositoryResult<Reminder | null>> {
    try {
      const row = this.database
        .select()
        .from(reminders)
        .where(ownedReminder(vehicleId, reminderId))
        .get();
      return repositorySuccess(row ? mapReminderRow(row) : null);
    } catch (error) {
      return mapFailure("reminder.get", error);
    }
  }

  async list(vehicleId: VehicleId): Promise<RepositoryResult<readonly Reminder[]>> {
    try {
      return repositorySuccess(
        this.database
          .select()
          .from(reminders)
          .where(eq(reminders.vehicleId, vehicleId))
          .orderBy(asc(reminders.kind), asc(reminders.id))
          .all()
          .map(mapReminderRow),
      );
    } catch (error) {
      return mapFailure("reminder.list", error);
    }
  }

  async update(reminder: Reminder): Promise<RepositoryResult<void>> {
    const operation = "reminder.update";
    try {
      return this.database.transaction((transaction) => {
        const condition = ownedReminder(reminder.vehicleId, reminder.id);
        const row = transaction.select().from(reminders).where(condition).get();
        if (!row) return repositoryFailure("not-found", operation);
        const stored = mapReminderRow(row);
        if (
          stored.kind !== reminder.kind ||
          stored.timeZone !== reminder.timeZone ||
          stored.createdAt !== reminder.createdAt
        ) {
          return repositoryFailure("conflict", operation);
        }
        const values = reminderValues(reminder);
        transaction
          .update(reminders)
          .set({
            dueDate: values.dueDate,
            notifyOnDueDate: values.notifyOnDueDate,
            notifyOneDayBefore: values.notifyOneDayBefore,
            notifySevenDaysBefore: values.notifySevenDaysBefore,
            updatedAt: values.updatedAt,
          })
          .where(condition)
          .run();
        return repositorySuccess(undefined);
      });
    } catch (error) {
      return mapFailure(operation, error);
    }
  }

  async delete(vehicleId: VehicleId, reminderId: ReminderId): Promise<RepositoryResult<void>> {
    const operation = "reminder.delete";
    try {
      const result = this.database
        .delete(reminders)
        .where(ownedReminder(vehicleId, reminderId))
        .run();
      return result.changes === 0
        ? repositoryFailure("not-found", operation)
        : repositorySuccess(undefined);
    } catch (error) {
      return mapFailure(operation, error);
    }
  }
}

function ownedReminder(vehicleId: VehicleId, reminderId: ReminderId) {
  return and(eq(reminders.vehicleId, vehicleId), eq(reminders.id, reminderId));
}

function mapFailure<T>(operation: string, error: unknown): RepositoryResult<T> {
  return repositoryFailure(
    error instanceof CorruptStoredDataError ? "corrupt-data" : "unavailable",
    operation,
    error,
  );
}
