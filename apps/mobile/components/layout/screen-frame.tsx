import { createContext, type PropsWithChildren, useContext } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ScreenFrameContext = createContext(false);

export function ScreenFrame({
  children,
  standalone = false,
}: PropsWithChildren<{ standalone?: boolean }>) {
  const contained = useContext(ScreenFrameContext);
  if (contained && !standalone) return <View className="flex-1 bg-canvas">{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#121212" }}>
      <ScreenFrameContext.Provider value>{children}</ScreenFrameContext.Provider>
    </SafeAreaView>
  );
}
