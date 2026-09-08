import { View, type ViewProps } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { ValidationFocusProvider } from "./validation-focus";

export function FormSection({ className, ...props }: ViewProps) {
  return (
    <ValidationFocusProvider>
      <Animated.View
        entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
        style={{ width: "100%", maxWidth: 672, alignSelf: "center" }}
      >
        <View className={`w-full gap-content ${className ?? ""}`} {...props} />
      </Animated.View>
    </ValidationFocusProvider>
  );
}
