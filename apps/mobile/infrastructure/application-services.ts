import { EraseAllData } from "@/application/storage/erase-all-data";
import { LocalEraseDataStorage } from "@/infrastructure/storage/local-erase-data-storage";

import type {
  HistoryEntryRepository,
  HistoryEntryReadRepository,
} from "@/application/repositories/history-entry-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import type { ReminderNotifications } from "@/application/notifications/reminder-notifications";
import { ReminderSchedule } from "@/application/notifications/reminder-schedule";
import {
  scheduleAwareReminderRepository,
  scheduleAwareVehicleRepository,
} from "@/application/notifications/schedule-aware-repositories";
import { startReminderScheduleLifecycle } from "@/infrastructure/notifications/reminder-schedule-lifecycle";
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
  SystemDocumentPicker,
  type DocumentFilePicker,
} from "@/infrastructure/documents/system-document-picker";
import {
  LocalObjectStorage,
  cleanTransientDocumentFiles,
} from "@/infrastructure/storage/local-object-storage";
import { SystemClock } from "@/infrastructure/time/system-clock";

import { ApplicationRuntime } from "@/application/lifecycle/application-runtime";
export type ApplicationServices = Readonly<{
  clock: Clock;
  eraseData: EraseAllData;
  documentPicker: DocumentFilePicker;
  documents: VehicleDocumentService;
  historyEntries: HistoryEntryRepository & HistoryEntryReadRepository;
  idGenerator: IdGenerator;
  managedFiles: ManagedFileCoordinator;
  photoPicker: VehiclePhotoPicker;
  refuellings: RefuellingService;
  reminders: ReminderService;
  reminderNotifications: ReminderNotifications;
  reminderSchedule: ReminderSchedule;
  vehicles: VehicleRepository;
}>;

export function createApplicationServices(database: AppDatabase) {
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
  const runtime = new ApplicationRuntime({
    resume: () => services.eraseData.resume(),
    recover: (ready) => {
      cleanTransientDocumentFiles();
      return managedFiles.reconcile(ready);
    },
    startSchedule: () => startReminderScheduleLifecycle(reminderSchedule, appI18n),
    stopSchedule: () => reminderSchedule.stop(),
  });
  const services = {
    clock,
    eraseData: new EraseAllData(new LocalEraseDataStorage(database), async () => {
      const reconciled = await reminderSchedule.reconcile();
      if (!reconciled.ok) return reconciled;
      await reminderNotifications.clearOwned();
      return { ok: true };
    }),
    documentPicker: new SystemDocumentPicker(),
    documents: new VehicleDocumentService(
      clock,
      idGenerator,
      new DrizzleVehicleDocumentRepository(database),
      managedFiles,
    ),
    historyEntries: vehicleHistory,
    idGenerator,
    managedFiles,
    photoPicker: new GalleryVehiclePhotoPicker(),
    refuellings: new RefuellingService(clock, idGenerator, refuellingRepository),
    reminders: new ReminderService(
      clock,
      idGenerator,
      scheduleAwareReminderRepository(reminderRepository, reminderSchedule),
    ),
    reminderNotifications,
    reminderSchedule,
    vehicles: scheduleAwareVehicleRepository(vehicleHistory, reminderSchedule),
  };
  const exposed: ApplicationServices = {
    ...services,
    eraseData: runtime.operations.wrap(services.eraseData),
    documents: runtime.operations.wrap(services.documents),
    historyEntries: runtime.operations.wrap(services.historyEntries),
    managedFiles: runtime.operations.wrap(services.managedFiles),
    refuellings: runtime.operations.wrap(services.refuellings),
    reminders: runtime.operations.wrap(services.reminders),
    vehicles: runtime.operations.wrap(services.vehicles),
    photoPicker: runtime.operations.wrap(services.photoPicker),
    documentPicker: runtime.operations.wrap(services.documentPicker),
  };
  return { services: exposed, runtime };
}
