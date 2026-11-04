import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
export function FormGroup({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View className="gap-content pb-content">
      <Text accessibilityRole="header" className="text-label font-semibold text-accent">
        {title}
      </Text>
      <View className="gap-content">{children}</View>
    </View>
  );
}
