import { Host } from "@expo/ui";
import { DatePickerDialog, TimePickerDialog } from "@expo/ui/jetpack-compose";
import { getCalendars } from "expo-localization";
import { materialSeed } from "@/styles/native-theme";
import { useAppTranslation } from "@/localization/use-app-translation";
import type { DateTimePickerProps } from "./date-time-picker";
import { utcClockForDevice, deviceClockToUtc } from "./material-time";

export default function DateTimePicker({
  value,
  mode = "date",
  onValueChange,
  onDismiss,
  maximumDate,
  minimumDate,
  is24Hour,
}: DateTimePickerProps) {
  const { t } = useAppTranslation();
  const select = (selected: Date) => {
    const date = mode === "time" ? deviceClockToUtc(value, selected) : selected;
    onValueChange?.({ nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } }, date);
  };
  const common = {
    onDateSelected: select,
    onDismissRequest: () => onDismiss?.(),
  };
  return (
    <Host colorScheme="dark" seedColor={materialSeed}>
      {mode === "time" ? (
        <TimePickerDialog
          {...common}
          confirmButtonLabel={t("entryForm.confirmTime")}
          dismissButtonLabel={t("entryForm.cancelTime")}
          initialDate={utcClockForDevice(value).toISOString()}
          is24Hour={is24Hour ?? getCalendars()[0]?.uses24hourClock ?? true}
        />
      ) : (
        <DatePickerDialog
          {...common}
          confirmButtonLabel={t("reminders.confirmDate")}
          dismissButtonLabel={t("reminders.cancelDate")}
          initialDate={value.toISOString()}
          selectableDates={{ start: minimumDate, end: maximumDate }}
        />
      )}
    </Host>
  );
}
