import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { formatCalendarDate } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";
import { Button } from "./button";

export function CalendarDateField({
  value,
  onChange,
  label,
  disabled,
  error,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  error?: string;
}>) {
  const { t, i18n } = useAppTranslation();
  const [picker, setPicker] = useState<Date | null>(null);
  return (
    <View className="gap-compact">
      <Text className="text-label font-semibold text-primary">{label}</Text>
      <Button
        accessibilityLabel={label}
        disabled={disabled}
        variant="secondary"
        label={value ? formatCalendarDate(value, i18n.language) : t("reminders.chooseDate")}
        onPress={() => setPicker(new Date(`${value || localToday()}T12:00:00.000Z`))}
      />
      {picker ? (
        <>
          <DateTimePicker
            value={picker}
            mode="date"
            timeZoneName="UTC"
            locale={i18n.language}
            themeVariant="dark"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onDismiss={() => setPicker(null)}
            onValueChange={(_event, selected) => {
              if (Platform.OS === "ios") setPicker(selected);
              else {
                onChange(selected.toISOString().slice(0, 10));
                setPicker(null);
              }
            }}
          />
          {Platform.OS === "ios" ? (
            <>
              <Button
                label={t("reminders.confirmDate")}
                onPress={() => {
                  onChange(picker.toISOString().slice(0, 10));
                  setPicker(null);
                }}
              />
              <Button
                label={t("reminders.cancelDate")}
                variant="secondary"
                onPress={() => setPicker(null)}
              />
            </>
          ) : null}
        </>
      ) : null}
      {value ? (
        <Button
          label={t("documents.clearDate")}
          variant="secondary"
          disabled={disabled}
          onPress={() => {
            onChange("");
            setPicker(null);
          }}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-caption text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
