import { useScrollPosition } from "./scroll-positions";
import { FlatList, type FlatListProps, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ListScreen<T>({
  embedded = false,
  scrollKey,
  ...props
}: FlatListProps<T> & { embedded?: boolean; scrollKey?: string }) {
  const position = useScrollPosition(scrollKey);
  const insets = useSafeAreaInsets();
  return (
    <View className={embedded ? "flex-1 rounded-panel bg-surface" : "flex-1 bg-canvas"}>
      <FlatList
        contentOffset={{ x: 0, y: position.initial }}
        onScroll={(event) => position.save(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={100}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 24 + (embedded ? 0 : insets.top),
          paddingBottom: 24 + (embedded ? 0 : insets.bottom),
          paddingLeft: 16 + (embedded ? 0 : insets.left),
          paddingRight: 16 + (embedded ? 0 : insets.right),
        }}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        initialNumToRender={12}
        {...props}
      />
    </View>
  );
}
