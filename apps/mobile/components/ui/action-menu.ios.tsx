import { Host } from "@expo/ui";
import { Menu, Button } from "@expo/ui/swift-ui";
import { disabled as disabledModifier } from "@expo/ui/swift-ui/modifiers";
import { nativeTheme } from "@/styles/native-theme";
import type { ActionMenuProps } from "./action-menu-types";

export function ActionMenu({ label, deleteLabel, disabled = false, onDelete }: ActionMenuProps) {
  return (
    <Host colorScheme="dark" seedColor={nativeTheme.accent} matchContents>
      <Menu label={label} systemImage="ellipsis.circle" modifiers={[disabledModifier(disabled)]}>
        <Button label={deleteLabel} systemImage="trash" role="destructive" onPress={onDelete} />
      </Menu>
    </Host>
  );
}
