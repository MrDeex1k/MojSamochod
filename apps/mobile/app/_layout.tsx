import Stack from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DatabaseProvider } from "@/components/providers/database-provider";
import { ApplicationProvider } from "@/components/providers/application-provider";

import "../global.css";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ApplicationProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ApplicationProvider>
      </DatabaseProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
