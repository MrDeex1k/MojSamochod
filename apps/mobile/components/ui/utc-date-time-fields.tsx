import { mergeUtcDateTime } from "./utc-date-time";
import { formatUtcDate, formatUtcTime } from "@/localization/formatters";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAppTranslation } from "@/localization/use-app-translation";
import { nativeTheme } from "@/styles/native-theme";

export function UtcDateTimeFields({
  value,
  onChange,
  maximumDate,
  error,
}: Readonly<{
  value: Date;
  onChange: (value: Date) => void;
  maximumDate: Date;
  error?: string;
}>) {
  const { t, i18n } = useAppTranslation();
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  return (
    <View>
      {(["date", "time"] as const).map((mode) => (
        <View
          key={mode}
          className="min-h-12 flex-row flex-wrap items-center justify-between gap-compact border-b border-divider py-compact"
        >
          <Text className="text-body text-primary">{t(`entryForm.${mode}Label`)}</Text>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              accessibilityLabel={t(`entryForm.${mode}Label`)}
              themeVariant="dark"
              accentColor={nativeTheme.accent}
              display="compact"
              mode={mode}
              timeZoneName="UTC"
              value={value}
              maximumDate={maximumDate}
              onValueChange={(_event, selected) =>
                onChange(mergeUtcDateTime(value, selected, mode))
              }
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(`entryForm.${mode}Label`)}
              onPress={() => setOpen(mode)}
              className="min-h-12 justify-center px-compact"
            >
              <Text className="text-body text-accent">
                {mode === "date"
                  ? formatUtcDate(value, i18n.language)
                  : formatUtcTime(value, i18n.language)}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
      {Platform.OS !== "ios" && open ? (
        <DateTimePicker
          mode={open}
          value={value}
          maximumDate={maximumDate}
          timeZoneName="UTC"
          onDismiss={() => setOpen(null)}
          onValueChange={(_event, selected) => {
            onChange(mergeUtcDateTime(value, selected, open));
            setOpen(null);
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
