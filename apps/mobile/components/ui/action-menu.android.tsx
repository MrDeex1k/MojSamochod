import { semantics } from "@expo/ui/jetpack-compose/modifiers";
import { materialIcons } from "./material-icons";
import { useState } from "react";
import { Host } from "@expo/ui";
import { DropdownMenu, DropdownMenuItem, IconButton, Icon, Text } from "@expo/ui/jetpack-compose";
import { nativeTheme, materialSeed } from "@/styles/native-theme";
import type { ActionMenuProps } from "./action-menu-types";

export function ActionMenu({ label, deleteLabel, disabled = false, onDelete }: ActionMenuProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Host colorScheme="dark" seedColor={materialSeed} matchContents>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <IconButton
            enabled={!disabled}
            onClick={() => setExpanded(true)}
            modifiers={[semantics({ contentDescription: label })]}
          >
            <Icon source={materialIcons.more} size={24} />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          <DropdownMenuItem
            elementColors={{ textColor: nativeTheme.danger }}
            onClick={() => {
              setExpanded(false);
              onDelete();
            }}
          >
            <DropdownMenuItem.Text>
              <Text>{deleteLabel}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
