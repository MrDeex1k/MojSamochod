import Stack from "expo-router/stack";
import { Button as NativeButton } from "react-native";
import { useAppTranslation } from "@/localization/use-app-translation";
import { nativeTheme } from "@/styles/native-theme";
import type { FormActionProps } from "./native-form-context";
export function FormToolbar({ busy, saveLabel, cancelLabel, onSave, onCancel }: FormActionProps) {
  const { t } = useAppTranslation();
  return (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <NativeButton
            color={nativeTheme.accent}
            title={cancelLabel}
            disabled={busy}
            onPress={onCancel}
          />
        ),
        headerRight: () => (
          <NativeButton
            color={nativeTheme.accent}
            title={t("common.save")}
            accessibilityLabel={saveLabel}
            disabled={busy}
            onPress={onSave}
          />
        ),
      }}
    />
  );
}
