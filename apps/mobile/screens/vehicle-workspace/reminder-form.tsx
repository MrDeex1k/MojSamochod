import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { ReminderService } from "@/application/reminders/reminder-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calendarDate, dateInReminderZone, reminderTimeZone } from "@/domain/reminders/calendar";
import {
  defaultNotificationDaysBefore,
  type NotificationDaysBefore,
  type Reminder,
  type ReminderKind,
} from "@/domain/reminders/reminder";
import type { Clock } from "@/domain/shared/ports";
import type { VehicleId } from "@/domain/shared/identifiers";
import { formatCalendarDate } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

export function ReminderForm({
  reminder,
  kind,
  vehicleId,
  reminders,
  clock,
  onSaved,
  onCancel,
  embedded = false,
}: Readonly<{
  reminder?: Reminder;
  kind: ReminderKind;
  vehicleId: VehicleId;
  reminders: ReminderService;
  clock: Clock;
  onSaved: () => void;
  onCancel: () => void;
  embedded?: boolean;
}>) {
  const { t, i18n } = useAppTranslation();
  const [dueDate, setDueDate] = useState<string>(reminder?.dueDate ?? "");
  const [offsets, setOffsets] = useState<readonly NotificationDaysBefore[]>(
    reminder?.notificationDaysBefore ?? defaultNotificationDaysBefore,
  );
  const [zone] = useState(
    () => reminder?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [picker, setPicker] = useState<Date | null>(null);
  const [dateError, setDateError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const initialOffsets = reminder?.notificationDaysBefore ?? defaultNotificationDaysBefore;
  const dirty =
    dueDate !== (reminder?.dueDate ?? "") ||
    offsets.length !== initialOffsets.length ||
    offsets.some((offset) => !initialOffsets.includes(offset));
  const cancel = () => {
    if (pending.current) return;
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert(t("reminders.discardTitle"), t("reminders.discardDescription"), [
      { text: t("reminders.keepEditing"), style: "cancel" },
      { text: t("reminders.discard"), style: "destructive", onPress: onCancel },
    ]);
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      cancel();
      return true;
    });
    return () => subscription.remove();
  });
  const save = async () => {
    if (pending.current) return;
    if (!calendarDate(dueDate).ok) {
      setDateError(true);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const input = { dueDate, notificationDaysBefore: offsets };
      const result = reminder
        ? await reminders.update(vehicleId, reminder.id, input)
        : await reminders.create({ ...input, vehicleId, kind, timeZone: zone });
      if (!result.ok) {
        setError(
          t(result.error.kind === "conflict" ? "reminders.conflictError" : "reminders.saveError"),
        );
        return;
      }
      onSaved();
    } catch {
      setError(t("reminders.saveError"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert(t("reminders.deleteTitle"), t("reminders.deleteDescription"), [
      { text: t("reminders.cancel"), style: "cancel" },
      {
        text: t("reminders.delete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (!reminder || pending.current) return;
            pending.current = true;
            setBusy(true);
            setError(null);
            try {
              const result = await reminders.delete(vehicleId, reminder.id);
              if (result.ok) onSaved();
              else setError(t("reminders.deleteError"));
            } catch {
              setError(t("reminders.deleteError"));
            } finally {
              pending.current = false;
              setBusy(false);
            }
          })();
        },
      },
    ]);
  const openPicker = () => {
    const parsedZone = reminderTimeZone(zone);
    const initial =
      dueDate ||
      (parsedZone.ok
        ? dateInReminderZone(clock.now(), parsedZone.value)
        : clock.now().toISOString().slice(0, 10));
    setPicker(new Date(`${initial}T12:00:00.000Z`));
  };
  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t(`reminders.kinds.${kind}`)}
      </Text>
      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">
          {t(`reminders.dateLabels.${kind}`)}
        </Text>
        <Button
          disabled={busy}
          accessibilityLabel={t(`reminders.dateLabels.${kind}`)}
          label={dueDate ? formatCalendarDate(dueDate, i18n.language) : t("reminders.chooseDate")}
          onPress={openPicker}
          variant="secondary"
        />
        {dateError ? (
          <Text accessibilityRole="alert" className="text-caption text-danger">
            {t("reminders.dateRequired")}
          </Text>
        ) : null}
      </View>
      {picker ? (
        <View className="gap-compact">
          <DateTimePicker
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant="dark"
            locale={i18n.language}
            timeZoneName="UTC"
            value={picker}
            onDismiss={() => setPicker(null)}
            onValueChange={(_event, selected) => {
              if (Platform.OS !== "ios") setPicker(null);
              if (Platform.OS === "ios") setPicker(selected);
              else {
                setDueDate(selected.toISOString().slice(0, 10));
                setDateError(false);
              }
            }}
          />
          {Platform.OS === "ios" ? (
            <>
              <Button
                label={t("reminders.confirmDate")}
                onPress={() => {
                  setDueDate(picker.toISOString().slice(0, 10));
                  setDateError(false);
                  setPicker(null);
                }}
              />
              <Button
                label={t("reminders.cancelDate")}
                onPress={() => setPicker(null)}
                variant="secondary"
              />
            </>
          ) : null}
        </View>
      ) : null}
      <Text accessibilityRole="header" className="text-heading font-semibold text-primary">
        {t("reminders.notifyWhen")}
      </Text>
      <Text className="text-body text-secondary">{t("reminders.zoneHelper", { zone })}</Text>
      {defaultNotificationDaysBefore.map((offset) => (
        <Pressable
          key={offset}
          accessibilityRole="checkbox"
          accessibilityLabel={t(`reminders.offsets.${offset}`)}
          accessibilityState={{ checked: offsets.includes(offset), disabled: busy }}
          disabled={busy}
          className={`min-h-12 flex-row items-center gap-content rounded-control border px-content py-control ${offsets.includes(offset) ? "border-accent bg-surface-strong" : "border-divider bg-surface-muted"}`}
          onPress={() =>
            setOffsets((current) =>
              current.includes(offset)
                ? current.filter((value) => value !== offset)
                : [...current, offset],
            )
          }
        >
          <Text className="text-body font-semibold text-accent">
            {offsets.includes(offset) ? "✓" : "○"}
          </Text>
          <Text className="flex-1 text-body text-primary">{t(`reminders.offsets.${offset}`)}</Text>
        </Pressable>
      ))}
      <Text className="text-caption text-secondary">
        {t(offsets.length ? "reminders.permissionOnSave" : "reminders.alertsOff")}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {error}
        </Text>
      ) : null}
      <Button
        disabled={busy || picker !== null}
        label={t("reminders.save")}
        onPress={() => void save()}
      />
      {reminder ? (
        <View className="w-1/2">
          <Button disabled={busy} label={t("reminders.delete")} onPress={remove} variant="danger" />
        </View>
      ) : null}
      <Button disabled={busy} label={t("reminders.cancel")} onPress={cancel} variant="secondary" />
    </Card>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
