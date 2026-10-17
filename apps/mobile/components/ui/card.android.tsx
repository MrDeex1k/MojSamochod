import { View } from "react-native";
import type { CardProps } from "./card";
export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <View
      className={`gap-content py-content ${variant === "strong" ? "bg-surface-muted" : "bg-canvas"} ${className ?? ""}`}
      {...props}
    />
  );
}
