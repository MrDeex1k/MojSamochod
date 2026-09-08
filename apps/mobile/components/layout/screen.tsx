import { ScrollView, type ScrollViewProps, View } from "react-native";
import { ScreenFrame } from "./screen-frame";
import { useNavigationInset } from "./navigation-inset";

type ScreenProps = ScrollViewProps & { contentClassName?: string };

export function Screen({
  children,
  contentClassName,
  contentContainerClassName,
  contentContainerStyle,
  keyboardDismissMode,
  keyboardShouldPersistTaps = "handled",
  ...props
}: ScreenProps) {
  const isIOS = process.env.EXPO_OS === "ios";
  const navigationInset = useNavigationInset();
  return (
    <ScreenFrame>
      <ScrollView
        automaticallyAdjustKeyboardInsets={isIOS}
        className="flex-1 bg-canvas"
        contentContainerClassName={`grow ${contentContainerClassName ?? ""}`}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={keyboardDismissMode ?? (isIOS ? "interactive" : "on-drag")}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
        contentContainerStyle={contentContainerStyle}
        scrollIndicatorInsets={{ bottom: navigationInset }}
      >
        <View className={`grow px-screen py-content ${contentClassName ?? ""}`}>{children}</View>
        <View style={{ height: navigationInset }} />
      </ScrollView>
    </ScreenFrame>
  );
}
