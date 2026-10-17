import { Host } from "@expo/ui";
import {
  Button as FilledButton,
  FilledTonalButton,
  OutlinedButton,
  TextButton,
  Text,
} from "@expo/ui/jetpack-compose";
import { defaultMinSize, fillMaxWidth, semantics } from "@expo/ui/jetpack-compose/modifiers";
import { View } from "react-native";
import { materialSeed, nativeTheme } from "@/styles/native-theme";
import { useAppTranslation } from "@/localization/use-app-translation";
import type { ButtonProps } from "./button";

export function Button({
  label,
  busy = false,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
  accessibilityState,
  onPress,
  className,
  style,
  testID,
}: ButtonProps) {
  const { t } = useAppTranslation();
  const isBusy = busy || accessibilityState?.busy === true;
  const isDisabled = disabled || isBusy;
  const Component =
    variant === "secondary"
      ? FilledTonalButton
      : variant === "danger"
        ? OutlinedButton
        : variant === "text"
          ? TextButton
          : FilledButton;
  return (
    <View
      className={className}
      style={typeof style === "function" ? style({ pressed: false, hovered: false }) : style}
      testID={testID}
    >
      <Host colorScheme="dark" seedColor={materialSeed} matchContents={{ vertical: true }}>
        <Component
          enabled={!isDisabled}
          onClick={onPress}
          colors={variant === "danger" ? { contentColor: nativeTheme.danger } : undefined}
          modifiers={[
            fillMaxWidth(),
            defaultMinSize({ minHeight: 48 }),
            semantics({
              contentDescription: accessibilityLabel ?? (isBusy ? t("formGuard.saving") : label),
            }),
          ]}
        >
          <Text>{isBusy ? t("formGuard.saving") : label}</Text>
        </Component>
      </Host>
    </View>
  );
}
