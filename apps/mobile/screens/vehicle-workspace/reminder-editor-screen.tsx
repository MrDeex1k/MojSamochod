import { useEffect, useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useApplicationServices } from "@/components/providers/application-provider";
import { useFinishNativeForm } from "@/components/layout/native-form-context";
import { Screen } from "@/components/layout/screen";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { useAppTranslation } from "@/localization/use-app-translation";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type { Reminder } from "@/domain/reminders/reminder";
import { ReminderForm } from "./reminder-form";
import { useWorkspaceSource } from "./workspace-provider";

export function ReminderEditorScreen() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const services = useApplicationServices();
  const finish = useFinishNativeForm();
  const { source, refresh } = useWorkspaceSource();
  const { t } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ vehicle: Vehicle; reminder?: Reminder } | "error" | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      const vehicle = await services.vehicles.get();
      if (!vehicle.ok || !vehicle.value) throw new Error("Vehicle unavailable");
      const reminders = await services.reminders.list(vehicle.value.id);
      if (!reminders.ok) throw reminders.error;
      if (active)
        setState({
          vehicle: vehicle.value,
          reminder: reminders.value.find((value) => value.kind === kind),
        });
    })().catch(() => {
      if (active) setState("error");
    });
    return () => {
      active = false;
    };
  }, [services, kind, attempt]);
  if (state === "error" || (kind !== "insurance" && kind !== "technicalInspection"))
    return (
      <Screen>
        <ErrorState
          title={t("workspace.errorTitle")}
          description={t("workspace.errorDescription")}
          actionLabel={t("database.errorAction")}
          onAction={() => setAttempt((value) => value + 1)}
        />
      </Screen>
    );
  if (!state)
    return (
      <Screen>
        <LoadingState label={t("workspace.loading")} />
      </Screen>
    );
  const close = () => {
    finish?.();
    router.back();
  };
  return (
    <>
      <Stack.Screen options={{ title: t(`reminders.kinds.${kind}`) }} />
      <ReminderForm
        {...services}
        vehicleId={state.vehicle.id}
        kind={kind}
        reminder={state.reminder}
        onCancel={close}
        onSaved={() => {
          source.invalidate("reminders");
          refresh();
          close();
        }}
      />
    </>
  );
}
