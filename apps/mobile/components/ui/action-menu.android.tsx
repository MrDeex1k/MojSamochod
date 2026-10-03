import { useState } from "react";
import { Host } from "@expo/ui";
import { DropdownMenu, DropdownMenuItem, Button, Text } from "@expo/ui/jetpack-compose";
import { nativeTheme } from "@/styles/native-theme";
import type { ActionMenuProps } from "./action-menu-types";

export function ActionMenu({ label, deleteLabel, disabled = false, onDelete }: ActionMenuProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Host colorScheme="dark" seedColor={nativeTheme.accent} matchContents>
      <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)}>
        <DropdownMenu.Trigger>
          <Button enabled={!disabled} onClick={() => setExpanded(true)}>
            <Text>{label}</Text>
          </Button>
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
