import Stack from "expo-router/stack";
import { Host } from "@expo/ui";
import { TextButton, Text } from "@expo/ui/jetpack-compose";
import { materialSeed } from "@/styles/native-theme";
import { IconAction } from "@/components/ui/icon-action";
import type { FormActionProps } from "./native-form-context";
export function FormToolbar({ busy, saveLabel, cancelLabel, onSave, onCancel }: FormActionProps) {
  return (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <IconAction icon="close" label={cancelLabel} disabled={busy} onPress={onCancel} />
        ),
        headerRight: () => (
          <Host colorScheme="dark" seedColor={materialSeed} matchContents>
            <TextButton enabled={!busy} onClick={onSave}>
              <Text>{saveLabel}</Text>
            </TextButton>
          </Host>
        ),
      }}
    />
  );
}
