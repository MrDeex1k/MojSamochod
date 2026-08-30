import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { Screen } from "@/components/layout/screen";
import { useApplicationServices } from "@/components/providers/application-provider";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { useAppTranslation } from "@/localization/use-app-translation";
import { FirstVehicleSetupScreen } from "@/screens/first-vehicle-setup";

export default function HomeScreen() {
  const { vehicles } = useApplicationServices();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"empty" | "error" | "loading" | "ready">("loading");

  useEffect(() => {
    let active = true;
    void vehicles.get().then((result) => {
      if (active) setState(result.ok ? (result.value ? "ready" : "empty") : "error");
    });
    return () => {
      active = false;
    };
  }, [attempt, vehicles]);

  if (state === "ready") return <Redirect href="/vehicle" />;
  if (state === "empty") return <FirstVehicleSetupScreen />;
  if (state === "error") {
    return (
      <Screen contentClassName="items-center justify-center">
        <ErrorState
          actionLabel={t("database.errorAction")}
          description={t("route.errorDescription")}
          onAction={() => {
            setState("loading");
            setAttempt((value) => value + 1);
          }}
          title={t("route.errorTitle")}
        />
      </Screen>
    );
  }
  return (
    <Screen contentClassName="items-center justify-center">
      <LoadingState label={t("route.loading")} />
    </Screen>
  );
}
