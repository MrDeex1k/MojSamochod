import { NativeNavigationFrameContext } from "./native-navigation-context";
import { nativeTheme } from "@/styles/native-theme";
import { createContext, type PropsWithChildren, useContext } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ScreenFrameContext = createContext(false);

export function ScreenFrame({
  children,
  standalone = false,
}: PropsWithChildren<{ standalone?: boolean }>) {
  const native = useContext(NativeNavigationFrameContext);
  const contained = useContext(ScreenFrameContext);
  if (contained && !standalone) return <View className="flex-1 bg-canvas">{children}</View>;
  return (
    <SafeAreaView
      edges={native ? ["left", "right"] : undefined}
      style={{ flex: 1, backgroundColor: nativeTheme.canvas }}
    >
      <ScreenFrameContext.Provider value>{children}</ScreenFrameContext.Provider>
    </SafeAreaView>
  );
}
