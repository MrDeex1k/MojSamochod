import { Alert } from "react-native";
import { Button } from "./button";
import type { ActionMenuProps } from "./action-menu-types";

// The supported native platforms resolve their toolkit-specific menu above.
export function ActionMenu({
  label,
  title,
  cancelLabel,
  deleteLabel,
  disabled,
  onDelete,
}: ActionMenuProps) {
  return (
    <Button
      disabled={disabled}
      label={label}
      variant="secondary"
      onPress={() =>
        Alert.alert(title, undefined, [
          { text: cancelLabel, style: "cancel" },
          { text: deleteLabel, style: "destructive", onPress: onDelete },
        ])
      }
    />
  );
}
