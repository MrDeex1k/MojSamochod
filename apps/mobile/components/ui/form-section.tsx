import type { ReactNode } from "react";
import { View, useWindowDimensions, type ViewProps } from "react-native";
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

export function FieldPair({
  first,
  second,
  equal = false,
}: {
  first: ReactNode;
  second: ReactNode;
  equal?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const scale = Math.max(1, fontScale);
  return (
    <View className="flex-row flex-wrap gap-compact">
      <View
        style={{
          flexGrow: equal ? 1 : 2,
          flexBasis: (equal ? 130 : 144) * scale,
          maxWidth: "100%",
        }}
      >
        {first}
      </View>
      <View style={{ flexGrow: 1, flexBasis: (equal ? 130 : 84) * scale, maxWidth: "100%" }}>
        {second}
      </View>
    </View>
  );
}
