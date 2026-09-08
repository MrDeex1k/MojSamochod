import { useScrollPosition } from "./scroll-positions";
import { FlatList, type FlatListProps, Platform, View } from "react-native";
import { ScreenFrame } from "./screen-frame";
import { useNavigationInset } from "./navigation-inset";
import { isValidElement } from "react";

export function ListScreen<T>({
  embedded = false,
  scrollKey,
  ListFooterComponent: Footer,
  ...props
}: FlatListProps<T> & { embedded?: boolean; scrollKey?: string }) {
  const position = useScrollPosition(scrollKey);
  const navigationInset = useNavigationInset();

  return (
    <ScreenFrame>
      <View className="flex-1 bg-canvas">
        <FlatList
          contentOffset={{ x: 0, y: position.initial }}
          onScroll={(event) => position.save(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={100}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 16,
            paddingBottom: 24,
            paddingLeft: embedded ? 20 : 16,
            paddingRight: embedded ? 20 : 16,
          }}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          initialNumToRender={12}
          scrollIndicatorInsets={{ bottom: navigationInset }}
          {...props}
          ListFooterComponent={
            <View>
              {isValidElement(Footer) ? Footer : Footer ? <Footer /> : null}
              <View style={{ height: navigationInset }} />
            </View>
          }
        />
      </View>
    </ScreenFrame>
  );
}
