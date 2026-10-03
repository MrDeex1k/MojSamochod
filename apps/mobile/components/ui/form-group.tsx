import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

export function FormGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View className="gap-compact">
      <Text
        accessibilityRole="header"
        className="px-compact text-caption font-semibold text-secondary"
      >
        {title}
      </Text>
      <View className="gap-content rounded-panel bg-surface-muted p-content">{children}</View>
    </View>
  );
}
