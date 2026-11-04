import { Pressable, Text } from "react-native";
import type { IconActionProps } from "./icon-action-types";
export function IconAction({ label, onPress, disabled }: IconActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}
