import { ActivityIndicator, View } from "react-native";
import { Pressable, type PressableProps, Text } from "react-native";
import { useAppTranslation } from "@/localization/use-app-translation";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  busy?: boolean;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, { container: string; label: string }> = {
  primary: {
    container: "bg-accent active:bg-accent-pressed",
    label: "text-on-accent",
  },
  secondary: {
    container: "bg-surface-strong active:opacity-80",
    label: "text-accent",
  },
  danger: {
    container: "border border-danger bg-transparent active:bg-surface-strong",
    label: "text-danger",
  },
};

export function Button({
  accessibilityState,
  busy = false,
  className,
  disabled = false,
  label,
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = variantClasses[variant];
  const { t } = useAppTranslation();
  const isBusy = busy || accessibilityState?.busy === true;
  const isDisabled = disabled === true || isBusy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, busy: isBusy, disabled: isDisabled }}
      className={`min-h-12 items-center justify-center rounded-control px-content py-control disabled:opacity-50 ${classes.container} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      <View className="flex-row items-center gap-compact">
        {isBusy ? (
          <ActivityIndicator accessibilityElementsHidden importantForAccessibility="no" />
        ) : null}
        <Text className={`text-body font-semibold ${classes.label}`}>
          {busy ? t("formGuard.saving") : label}
        </Text>
      </View>
    </Pressable>
  );
}
