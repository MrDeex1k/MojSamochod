import { DatabaseSession } from "@/application/lifecycle/database-session";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  | {
      handle: DatabaseHandle;
      session: DatabaseSession<AppDatabase>;
      generation: number;
      status: "ready";
    }
  | { status: "error"; cause: unknown };

const SessionContext = createContext<DatabaseSession<AppDatabase> | null>(null);
const DatabaseContext = createContext<AppDatabase | null>(null);

export function DatabaseProvider({
  children,
  initialize = initializeDatabase,
}: DatabaseProviderProps) {
  const { t } = useAppTranslation();
  const generation = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DatabaseState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    const session = new DatabaseSession(initialize);

    void session.open().then(
      (handle) => {
        if (disposed) {
          void session.close().catch(() => undefined);
          return;
        }

        setState({ handle, session, generation: ++generation.current, status: "ready" });
      },
      (cause) => {
        void session.close();
        if (!disposed) {
          setState({ status: "error", cause });
        }
      },
    );

    return () => {
      disposed = true;
      void session.close().catch(() => undefined);
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
    <DatabaseContext.Provider key={state.generation} value={state.handle.database}>
      <SessionContext.Provider value={state.session}>{children}</SessionContext.Provider>
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): AppDatabase {
  const database = useContext(DatabaseContext);

  if (!database) {
    throw new Error("useDatabase must be used within DatabaseProvider");
  }

  return database;
}

export function useDatabaseSession(): DatabaseSession<AppDatabase> {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Database session is unavailable");
  return session;
}
