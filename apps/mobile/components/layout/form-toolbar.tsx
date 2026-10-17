import Stack from "expo-router/stack";
import { Button as NativeButton } from "react-native";
import { nativeTheme } from "@/styles/native-theme";
import type { FormActionProps } from "./native-form-context";
export function FormToolbar({ busy, saveLabel, cancelLabel, onSave, onCancel }: FormActionProps) {
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
            title={saveLabel}
            disabled={busy}
            onPress={onSave}
          />
        ),
      }}
    />
  );
}
