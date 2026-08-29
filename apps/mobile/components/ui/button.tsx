import { Pressable, type PressableProps, Text } from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, { container: string; label: string }> = {
  primary: {
    container: "bg-accent active:bg-accent-pressed",
    label: "text-on-accent",
  },
  secondary: {
    container: "border border-divider bg-surface-strong active:opacity-80",
    label: "text-primary",
  },
  danger: {
    container: "border border-danger bg-transparent active:bg-surface-strong",
    label: "text-danger",
  },
};

export function Button({
  accessibilityState,
  className,
  disabled = false,
  label,
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = variantClasses[variant];
  const isDisabled = disabled === true;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: isDisabled }}
      className={`min-h-12 items-center justify-center rounded-control px-content py-control disabled:opacity-50 ${classes.container} ${className ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      <Text className={`text-body font-semibold ${classes.label}`}>{label}</Text>
    </Pressable>
  );
}
