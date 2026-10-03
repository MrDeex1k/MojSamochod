import { Platform } from "react-native";
import { NativeNavigationFrameContext } from "@/components/layout/native-navigation-context";
import Stack from "expo-router/stack";
import { WorkspaceProvider } from "@/screens/vehicle-workspace/workspace-provider";
import { nativeTheme } from "@/styles/native-theme";

export const unstable_settings = { anchor: "(tabs)" };
export default function VehicleLayout() {
  return (
    <NativeNavigationFrameContext.Provider value>
      <WorkspaceProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: nativeTheme.canvas },
            headerTintColor: nativeTheme.accent,
            headerTitleStyle: { color: nativeTheme.primary },
            contentStyle: { backgroundColor: nativeTheme.canvas },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="editor"
            options={{
              presentation: Platform.OS === "ios" ? "formSheet" : "modal",
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="reminder-editor"
            options={{
              presentation: Platform.OS === "ios" ? "formSheet" : "modal",
              sheetAllowedDetents: [1],
              sheetGrabberVisible: true,
            }}
          />
        </Stack>
      </WorkspaceProvider>
    </NativeNavigationFrameContext.Provider>
  );
}
