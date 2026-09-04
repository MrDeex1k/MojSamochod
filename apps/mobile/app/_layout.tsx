import Stack from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DatabaseProvider } from "@/components/providers/database-provider";
import { ApplicationProvider } from "@/components/providers/application-provider";
import { configureReminderNotificationPresentation } from "@/infrastructure/notifications/native-reminder-notifications";

import "../global.css";

// Registers foreground presentation only; does not request permission or schedule alerts.
configureReminderNotificationPresentation();

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
