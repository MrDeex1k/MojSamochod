import { ScrollView, type ScrollViewProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenProps = ScrollViewProps & {
  contentClassName?: string;
};

export function Screen({
  children,
  contentClassName,
  contentContainerClassName,
  keyboardDismissMode,
  keyboardShouldPersistTaps = "handled",
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const isIOS = process.env.EXPO_OS === "ios";

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets={isIOS}
      className="flex-1 bg-canvas"
      contentContainerClassName={`grow ${contentContainerClassName ?? ""}`}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={keyboardDismissMode ?? (isIOS ? "interactive" : "on-drag")}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      <View
        className="grow"
        style={
          isIOS
            ? undefined
            : {
                paddingTop: insets.top,
                paddingRight: insets.right,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
              }
        }
      >
        <View className={`grow px-screen py-section ${contentClassName ?? ""}`}>{children}</View>
      </View>
    </ScrollView>
  );
}
