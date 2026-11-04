import { Host } from "@expo/ui";
import { ExtendedFloatingActionButton, Icon, Text } from "@expo/ui/jetpack-compose";
import { semantics } from "@expo/ui/jetpack-compose/modifiers";
import { materialSeed } from "@/styles/native-theme";
import { materialIcons } from "./material-icons";
import type { FloatingActionProps } from "./floating-action";
export function FloatingAction({ label, onPress }: FloatingActionProps) {
  return (
    <Host colorScheme="dark" seedColor={materialSeed} matchContents>
      <ExtendedFloatingActionButton
        onClick={onPress}
        modifiers={[semantics({ contentDescription: label })]}
      >
        <ExtendedFloatingActionButton.Icon>
          <Icon source={materialIcons.add} size={24} />
        </ExtendedFloatingActionButton.Icon>
        <ExtendedFloatingActionButton.Text>
          <Text style={{ typography: "labelLarge" }}>{label}</Text>
        </ExtendedFloatingActionButton.Text>
      </ExtendedFloatingActionButton>
    </Host>
  );
}
