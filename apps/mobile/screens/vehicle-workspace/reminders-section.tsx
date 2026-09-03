import { useEffect, useState } from "react";
import { AppState, BackHandler, ScrollView, Text, View } from "react-native";
import type { ApplicationServices } from "@/components/providers/application-provider";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reminderStatus, type Reminder, type ReminderKind } from "@/domain/reminders/reminder";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { formatCalendarDate } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";
import { ReminderForm } from "./reminder-form";
import { ReminderNotificationStatus } from "./reminder-notification-status";

type Props = Pick<
  ApplicationServices,
  "clock" | "reminders" | "reminderNotifications" | "reminderSchedule"
> &
  Readonly<{
    vehicle: Vehicle;
    onBack: () => void;
    embedded?: boolean;
  }>;

export function RemindersSection({
  clock,
  reminders,
  reminderNotifications,
  reminderSchedule,
  vehicle,
  onBack,
  embedded = false,
}: Props) {
  const { t, i18n } = useAppTranslation();
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<{ kind: ReminderKind; reminder?: Reminder } | null>(null);
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; reminders: readonly Reminder[] }
  >({ status: "loading" });
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    let active = true;
    void reminders
      .list(vehicle.id)
      .then((result) => {
        if (active)
          setState(result.ok ? { status: "ready", reminders: result.value } : { status: "error" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [attempt, reminders, vehicle.id]);
  useEffect(() => {
    void reminderSchedule.reconcile();
    const refresh = () => setNow(clock.now());
    // Deadline states must not stay stale when this screen remains open across midnight.
    const interval = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener("change", (value) => {
      if (value === "active") refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [clock, reminderSchedule]);
  useEffect(() => {
    if (editing) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [editing, onBack]);
  if (editing)
    return (
      <ReminderForm
        key={editing.reminder?.id ?? editing.kind}
        {...editing}
        clock={clock}
        vehicleId={vehicle.id}
        reminders={reminders}
        embedded={embedded}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setState({ status: "loading" });
          setAttempt((value) => value + 1);
          setNow(clock.now());
          setEditing(null);
        }}
      />
    );
  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("reminders.title")}
      </Text>
      {state.status === "loading" ? (
        <Text className="text-body text-secondary">{t("reminders.loading")}</Text>
      ) : state.status === "error" ? (
        <>
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t("reminders.loadError")}
          </Text>
          <Button
            label={t("reminders.retry")}
            onPress={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}
          />
        </>
      ) : (
        <>
          {(["insurance", "technicalInspection"] as const).map((kind) => {
            const reminder = state.reminders.find((item) => item.kind === kind);
            const status = reminder ? reminderStatus(reminder, now) : null;
            return (
              <View key={kind} className="gap-content rounded-control bg-surface-muted p-content">
                <Text
                  accessibilityRole="header"
                  className="text-heading font-semibold text-primary"
                >
                  {t(`reminders.kinds.${kind}`)}
                </Text>
                {reminder ? (
                  <>
                    <Text className="text-title font-bold text-primary">
                      {formatCalendarDate(reminder.dueDate, i18n.language)}
                    </Text>
                    <Text
                      className={`text-body font-semibold ${status === "overdue" ? "text-danger" : "text-accent"}`}
                    >
                      {t(`reminders.status.${status}`)}
                    </Text>
                    <Text className="text-caption text-secondary">
                      {reminder.notificationDaysBefore.length
                        ? t("reminders.zoneHelper", { zone: reminder.timeZone })
                        : t("reminders.alertsOff")}
                    </Text>
                    <Button
                      accessibilityLabel={t("reminders.editKind", {
                        kind: t(`reminders.kinds.${kind}`),
                      })}
                      label={t("reminders.edit")}
                      onPress={() => setEditing({ kind, reminder })}
                      variant="secondary"
                    />
                  </>
                ) : (
                  <Button
                    accessibilityLabel={t("reminders.addKind", {
                      kind: t(`reminders.kinds.${kind}`),
                    })}
                    label={t("reminders.add")}
                    onPress={() => setEditing({ kind })}
                    variant="secondary"
                  />
                )}
              </View>
            );
          })}
          {state.reminders.some((item) => item.notificationDaysBefore.length > 0) ? (
            <ReminderNotificationStatus
              notifications={reminderNotifications}
              schedule={reminderSchedule}
            />
          ) : null}
        </>
      )}
      <Button label={t("reminders.back")} onPress={onBack} variant="secondary" />
    </Card>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
