import { DataAccess } from "@/application/maintenance/data-access";
import { DataReset } from "@/application/maintenance/data-reset";
import { DrizzleDataResetStore } from "@/infrastructure/database/drizzle-data-reset-store";
import { erasePrivateFiles } from "@/infrastructure/storage/erase-private-files";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import {
  scheduleAwareReminderRepository,
  scheduleAwareVehicleRepository,
} from "@/application/notifications/schedule-aware-repositories";
import { reminderNotificationContent } from "@/localization/reminder-notification-content";
import { NativeReminderNotifications } from "@/infrastructure/notifications/native-reminder-notifications";
import { appI18n } from "@/localization/i18n";
import { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { RefuellingService } from "@/application/refuelling/refuelling-service";
import { ReminderService } from "@/application/reminders/reminder-service";
import { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import { DrizzleManagedFileRepository } from "@/infrastructure/database/drizzle-managed-file-repository";
import { DrizzleRefuellingRepository } from "@/infrastructure/database/drizzle-refuelling-repository";
import { DrizzleReminderRepository } from "@/infrastructure/database/drizzle-reminder-repository";
import { DrizzleVehicleDocumentRepository } from "@/infrastructure/database/drizzle-vehicle-document-repository";
import { DrizzleVehicleHistoryRepository } from "@/infrastructure/database/drizzle-vehicle-history-repository";
import type { AppDatabase } from "@/infrastructure/database/database";
import { UuidV7IdGenerator } from "@/infrastructure/identity/uuid-v7-id-generator";
import {
  GalleryVehiclePhotoPicker,
  type VehiclePhotoPicker,
} from "@/infrastructure/media/gallery-vehicle-photo-picker";
import {
  NativeDocumentPresenter,
  type DocumentPresenter,
} from "@/infrastructure/documents/native-document-presenter";
import {
  SystemDocumentPicker,
  type DocumentFilePicker,
} from "@/infrastructure/documents/system-document-picker";
import { LocalObjectStorage } from "@/infrastructure/storage/local-object-storage";
import { SystemClock } from "@/infrastructure/time/system-clock";

export type ApplicationServices = Readonly<{
  eraseAllData: () => void;
  clock: Clock;
  documentPicker: DocumentFilePicker;
  documentPresenter: DocumentPresenter;
  documents: VehicleDocumentService;
  historyEntries: HistoryEntryRepository;
  idGenerator: IdGenerator;
  managedFiles: ManagedFileCoordinator;
  photoPicker: VehiclePhotoPicker;
  refuellings: RefuellingService;
  reminders: ReminderService;
  reminderNotifications: ReminderNotifications;
  reminderSchedule: ReminderSchedule;
  vehicles: VehicleRepository;
}>;

export function createApplicationRuntime(database: AppDatabase, eraseAllData: () => void) {
  const access = new DataAccess();
  const clock = new SystemClock();
  const vehicleHistory = new DrizzleVehicleHistoryRepository(database);
  const refuellingRepository = new DrizzleRefuellingRepository(database);
  const idGenerator = new UuidV7IdGenerator();
  const reminderRepository = new DrizzleReminderRepository(database);
  const reminderNotifications = new NativeReminderNotifications(
    clock,
    () => appI18n.t("notifications.channelName"),
    () => {
      void reminderSchedule.reconcile();
    },
  );
  const reminderSchedule = new ReminderSchedule(
    clock,
    vehicleHistory,
    reminderRepository,
    reminderNotifications,
    reminderNotificationContent,
  );
  const managedFiles = new ManagedFileCoordinator(
    clock,
    new DrizzleManagedFileRepository(database),
    new LocalObjectStorage(),
  );
  const documentPicker = new SystemDocumentPicker();
  const photoPicker = new GalleryVehiclePhotoPicker();
  const documentPresenter = new NativeDocumentPresenter();
  const services: ApplicationServices = {
    eraseAllData,
    clock,
    documentPicker: {
      pick: () => access.track(() => documentPicker.pick(), { kind: "cancelled" }),
    },
    documentPresenter: {
      downloadPdf: (input) => access.track(() => documentPresenter.downloadPdf(input), "cancelled"),
    },
    documents: access.guard(
      new VehicleDocumentService(
        clock,
        idGenerator,
        new DrizzleVehicleDocumentRepository(database),
        managedFiles,
      ),
    ),
    historyEntries: access.guard(vehicleHistory),
    idGenerator,
    managedFiles: access.guard(managedFiles),
    photoPicker: { select: () => access.track(() => photoPicker.select(), { kind: "cancelled" }) },
    refuellings: access.guard(new RefuellingService(clock, idGenerator, refuellingRepository)),
    reminders: access.guard(
      new ReminderService(
        clock,
        idGenerator,
        scheduleAwareReminderRepository(reminderRepository, reminderSchedule),
      ),
    ),
    reminderNotifications,
    reminderSchedule,
    vehicles: access.guard(scheduleAwareVehicleRepository(vehicleHistory, reminderSchedule)),
  };
  const reset = new DataReset({
    store: new DrizzleDataResetStore(database),
    stopDataAccess: () => access.stop(),
    stopScheduling: () => reminderSchedule.stop(),
    cancelNotifications: () => reminderNotifications.clearOwned(),
    eraseFiles: erasePrivateFiles,
  });
  return { services, reset };
}
