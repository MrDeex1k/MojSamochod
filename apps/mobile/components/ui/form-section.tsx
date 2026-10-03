import { View, type ViewProps } from "react-native";
import { ValidationFocusProvider } from "./validation-focus";

export function FormSection({ className, ...props }: ViewProps) {
  return (
    <ValidationFocusProvider>
      <View style={{ width: "100%", maxWidth: 672, alignSelf: "center" }}>
        <View className={`w-full gap-content ${className ?? ""}`} {...props} />
      </View>
    </ValidationFocusProvider>
  );
}
