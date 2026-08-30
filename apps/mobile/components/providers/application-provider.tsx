import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import type { VehicleRepository } from "@/application/repositories/vehicle-repository";
import { ManagedFileCoordinator } from "@/application/storage/managed-file-coordinator";
import { Screen } from "@/components/layout/screen";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import { DrizzleManagedFileRepository } from "@/infrastructure/database/drizzle-managed-file-repository";
import { DrizzleVehicleHistoryRepository } from "@/infrastructure/database/drizzle-vehicle-history-repository";
import type { AppDatabase } from "@/infrastructure/database/database";
import { UuidV7IdGenerator } from "@/infrastructure/identity/uuid-v7-id-generator";
import {
  GalleryVehiclePhotoPicker,
  type VehiclePhotoPicker,
} from "@/infrastructure/media/gallery-vehicle-photo-picker";
import { LocalObjectStorage } from "@/infrastructure/storage/local-object-storage";
import { SystemClock } from "@/infrastructure/time/system-clock";
import { useAppTranslation } from "@/localization/use-app-translation";

import { useDatabase } from "./database-provider";

export type ApplicationServices = Readonly<{
  clock: Clock;
  historyEntries: HistoryEntryRepository;
  idGenerator: IdGenerator;
  managedFiles: ManagedFileCoordinator;
  photoPicker: VehiclePhotoPicker;
  vehicles: VehicleRepository;
}>;

const ApplicationContext = createContext<ApplicationServices | null>(null);

export function ApplicationProvider({ children }: PropsWithChildren) {
  const database = useDatabase();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [services] = useState(() => createApplicationServices(database));

  useEffect(() => {
    let active = true;
    void services.managedFiles.reconcile().then((result) => {
      if (active) setStatus(result.ok ? "ready" : "error");
    });
    return () => {
      active = false;
    };
  }, [attempt, services]);

  if (status === "loading") {
    return (
      <Screen contentClassName="items-center justify-center">
        <LoadingState label={t("storage.loading")} />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t("storage.errorDescription")}
          onAction={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
          title={t("storage.errorTitle")}
        />
      </Screen>
    );
  }

  return <ApplicationContext.Provider value={services}>{children}</ApplicationContext.Provider>;
}

function createApplicationServices(database: AppDatabase): ApplicationServices {
  const clock = new SystemClock();
  const vehicleHistory = new DrizzleVehicleHistoryRepository(database);
  return {
    clock,
    historyEntries: vehicleHistory,
    idGenerator: new UuidV7IdGenerator(),
    managedFiles: new ManagedFileCoordinator(
      clock,
      new DrizzleManagedFileRepository(database),
      new LocalObjectStorage(),
    ),
    photoPicker: new GalleryVehiclePhotoPicker(),
    vehicles: vehicleHistory,
  };
}

export function useApplicationServices(): ApplicationServices {
  const services = useContext(ApplicationContext);
  if (!services) throw new Error("useApplicationServices must be used within ApplicationProvider");
  return services;
}
