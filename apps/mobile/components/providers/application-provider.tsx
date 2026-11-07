import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { Screen } from "@/components/layout/screen";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { useAppTranslation } from "@/localization/use-app-translation";
import {
  createApplicationServices,
  type ApplicationServices,
} from "@/infrastructure/application-services";
import { useDatabase, useDatabaseSession } from "./database-provider";
export type { ApplicationServices } from "@/infrastructure/application-services";

const ApplicationContext = createContext<ApplicationServices | null>(null);
export function ApplicationProvider({ children }: PropsWithChildren) {
  const database = useDatabase();
  const session = useDatabaseSession();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"error" | "loading" | "ready">("loading");
  const [services, setServices] = useState<ApplicationServices | null>(null);
  useEffect(() => {
    let active = true;
    let recovered = false;
    const instance = createApplicationServices(database);
    void session
      .register(() => instance.runtime.stop())
      .then(() =>
        instance.runtime.start(() => {
          recovered = true;
          if (active) {
            setServices(instance.services);
            setStatus("ready");
          }
        }),
      )
      .then((result) => {
        if (active && !recovered) setStatus(result.ok ? "ready" : "error");
      });
    return () => {
      active = false;
      void instance.runtime.stop();
    };
  }, [attempt, database, session]);

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

  return <ApplicationContext.Provider value={services!}>{children}</ApplicationContext.Provider>;
}

export function useApplicationServices(): ApplicationServices {
  const services = useContext(ApplicationContext);
  if (!services) throw new Error("useApplicationServices must be used within ApplicationProvider");
  return services;
}
