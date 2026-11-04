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
import type { ButtonProps, ButtonVariant } from "./button";

const materialButtons: Record<ButtonVariant, typeof FilledButton> = {
  primary: FilledButton,
  secondary: FilledTonalButton,
  danger: OutlinedButton,
  text: TextButton,
};

export function Button({
  label,
  busy = false,
  disabled = false,
  variant = "primary",
  accessibilityLabel,
  accessibilityState,
  onPress,
  className,
  compact = false,
  style,
  testID,
}: ButtonProps) {
  const { t } = useAppTranslation();
  const isBusy = busy || accessibilityState?.busy === true;
  const isDisabled = disabled || isBusy;
  const Component = materialButtons[variant];
  return (
    <View
      className={className}
      style={[
        compact && { alignSelf: "flex-start", maxWidth: "100%" },
        typeof style === "function" ? style({ pressed: false, hovered: false }) : style,
      ]}
      testID={testID}
    >
      <Host
        colorScheme="dark"
        seedColor={materialSeed}
        matchContents={compact ? true : { vertical: true }}
      >
        <Component
          enabled={!isDisabled}
          onClick={onPress}
          colors={variant === "danger" ? { contentColor: nativeTheme.danger } : undefined}
          modifiers={[
            ...(compact ? [] : [fillMaxWidth()]),
            defaultMinSize({ minHeight: 48 }),
            semantics({
              contentDescription: accessibilityLabel ?? (isBusy ? t("formGuard.saving") : label),
            }),
          ]}
        >
          <Text style={{ typography: "labelLarge" }}>{isBusy ? t("formGuard.saving") : label}</Text>
        </Component>
      </Host>
    </View>
  );
}
