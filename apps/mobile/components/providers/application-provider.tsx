import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import {
  createApplicationRuntime,
  type ApplicationServices,
} from "@/infrastructure/application-runtime";
export type { ApplicationServices } from "@/infrastructure/application-runtime";
import { startReminderScheduleLifecycle } from "@/infrastructure/notifications/reminder-schedule-lifecycle";
import { appI18n } from "@/localization/i18n";
import { Screen } from "@/components/layout/screen";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { useAppTranslation } from "@/localization/use-app-translation";
import { useDatabase } from "./database-provider";

const ApplicationContext = createContext<ApplicationServices | null>(null);

export function ApplicationProvider({ children }: PropsWithChildren) {
  const [generation, setGeneration] = useState(0);
  const restart = () => setGeneration((value) => value + 1);
  return (
    <ApplicationSession key={generation} onReset={restart}>
      {children}
    </ApplicationSession>
  );
}

function ApplicationSession({ children, onReset }: PropsWithChildren<{ onReset: () => void }>) {
  const database = useDatabase();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [confirmedReset, setConfirmedReset] = useState(false);
  const [runtime] = useState(() =>
    createApplicationRuntime(database, () => {
      setStatus("loading");
      setConfirmedReset(true);
    }),
  );
  const { services, reset } = runtime;

  useEffect(() => {
    let active = true;
    let stopLifecycle: (() => void) | undefined;
    const initialize = async () => {
      if (confirmedReset) {
        await reset.erase();
        if (active) onReset();
        return;
      }
      if (await reset.resumeIfPending()) {
        if (active) onReset();
        return;
      }
      const result = await services.managedFiles.reconcile();
      if (!active) return;
      if (result.ok)
        stopLifecycle = startReminderScheduleLifecycle(services.reminderSchedule, appI18n);
      setStatus(result.ok ? "ready" : "error");
    };
    void initialize().catch(() => {
      if (active) setStatus("error");
    });
    return () => {
      active = false;
      stopLifecycle?.();
    };
  }, [attempt, confirmedReset, onReset, reset, services]);

  if (status === "loading") {
    return (
      <Screen contentClassName="items-center justify-center">
        <LoadingState label={t(confirmedReset ? "settings.reset.loading" : "storage.loading")} />
      </Screen>
    );
  }

  if (status === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t(confirmedReset ? "settings.reset.error" : "storage.errorDescription")}
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

export function useApplicationServices(): ApplicationServices {
  const services = useContext(ApplicationContext);
  if (!services) throw new Error("useApplicationServices must be used within ApplicationProvider");
  return services;
}
