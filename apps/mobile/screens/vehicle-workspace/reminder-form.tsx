import { Host, Switch } from "@expo/ui";
import { nativeTheme } from "@/styles/native-theme";
import { FormActions, FormTitle } from "@/components/layout/native-form";
import { useFormExitGuard } from "@/components/layout/navigation-guard";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRef, useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import type { ReminderService } from "@/application/reminders/reminder-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
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
  const cancel = useFormExitGuard({ dueDate, offsets: [...offsets].sort() }, busy, onCancel);
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
      } else {
        onSaved();
      }
    } catch {
      setError(t("reminders.saveError"));
    }
    pending.current = false;
    setBusy(false);
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
            }
            pending.current = false;
            setBusy(false);
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
    <FormSection className={embedded ? "p-screen" : undefined}>
      <FormTitle>{t(`reminders.kinds.${kind}`)}</FormTitle>
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
        <Host
          key={offset}
          colorScheme="dark"
          seedColor={nativeTheme.accent}
          matchContents={{ vertical: true }}
        >
          <Switch
            label={t(`reminders.offsets.${offset}`)}
            value={offsets.includes(offset)}
            disabled={busy}
            onValueChange={(enabled) =>
              setOffsets((current) =>
                enabled
                  ? [...current.filter((value) => value !== offset), offset]
                  : current.filter((value) => value !== offset),
              )
            }
          />
        </Host>
      ))}
      <Text className="text-caption text-secondary">
        {t(offsets.length ? "reminders.permissionOnSave" : "reminders.alertsOff")}
      </Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-body text-danger">
          {error}
        </Text>
      ) : null}
      <FormActions
        busy={busy || picker !== null}
        saveLabel={t("reminders.save")}
        cancelLabel={t("reminders.cancel")}
        onSave={() => void save()}
        onCancel={cancel}
      />
      {reminder ? (
        <View className="w-1/2">
          <Button disabled={busy} label={t("reminders.delete")} onPress={remove} variant="danger" />
        </View>
      ) : null}
    </FormSection>
  );
  return embedded ? (
    <ScrollView
      contentContainerClassName="grow"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
