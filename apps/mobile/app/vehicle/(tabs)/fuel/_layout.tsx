import Stack from "expo-router/stack";
import { nativeTheme } from "@/styles/native-theme";
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: nativeTheme.canvas },
        headerTintColor: nativeTheme.accent,
        headerTitleStyle: { color: nativeTheme.primary },
        contentStyle: { backgroundColor: nativeTheme.canvas },
      }}
    />
  );
}
