import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";

import { Screen } from "@/components/layout/screen";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import {
  initializeDatabase,
  type AppDatabase,
  type DatabaseHandle,
} from "@/infrastructure/database/database";
import { useAppTranslation } from "@/localization/use-app-translation";

type DatabaseProviderProps = PropsWithChildren<{
  initialize?: () => Promise<DatabaseHandle>;
}>;

type DatabaseState =
  | { status: "loading" }
  | { handle: DatabaseHandle; status: "ready" }
  | { status: "error" };

const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({
  children,
  initialize = initializeDatabase,
}: DatabaseProviderProps) {
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DatabaseState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    let activeHandle: DatabaseHandle | null = null;

    void initialize().then(
      (handle) => {
        if (disposed) {
          void handle.close().catch(() => undefined);
          return;
        }

        activeHandle = handle;
        setState({ handle, status: "ready" });
      },
      () => {
        if (!disposed) {
          setState({ status: "error" });
        }
      },
    );

    return () => {
      disposed = true;
      if (activeHandle) {
        void activeHandle.close().catch(() => undefined);
      }
    };
  }, [attempt, initialize]);

  if (state.status === "loading") {
    return (
      <Screen contentClassName="items-center justify-center">
        <LoadingState label={t("database.loading")} />
      </Screen>
    );
  }

  if (state.status === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t("database.errorDescription")}
          onAction={() => {
            setState({ status: "loading" });
            setAttempt((currentAttempt) => currentAttempt + 1);
          }}
          title={t("database.errorTitle")}
        />
      </Screen>
    );
  }

  return (
    <DatabaseContext.Provider value={state.handle.database}>{children}</DatabaseContext.Provider>
  );
}

export function useDatabase(): AppDatabase {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }

  return database;
}
