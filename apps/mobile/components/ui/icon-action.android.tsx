import { Host } from "@expo/ui";
import { IconButton, Icon } from "@expo/ui/jetpack-compose";
import { size, semantics } from "@expo/ui/jetpack-compose/modifiers";
import { materialSeed } from "@/styles/native-theme";
import { materialIcons } from "./material-icons";
import type { IconActionProps } from "./icon-action-types";
export function IconAction({ icon, label, onPress, disabled }: IconActionProps) {
  return (
    <Host colorScheme="dark" seedColor={materialSeed} matchContents>
      <IconButton
        enabled={!disabled}
        onClick={onPress}
        modifiers={[size(48, 48), semantics({ contentDescription: label })]}
      >
        <Icon source={materialIcons[icon]} size={24} />
      </IconButton>
    </Host>
  );
}
