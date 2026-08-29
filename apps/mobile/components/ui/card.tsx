import { View, type ViewProps } from "react-native";

type CardVariant = "default" | "strong";

type CardProps = ViewProps & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface",
  strong: "bg-surface-strong",
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <View
      className={`gap-content rounded-panel border border-divider p-screen ${variantClasses[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
