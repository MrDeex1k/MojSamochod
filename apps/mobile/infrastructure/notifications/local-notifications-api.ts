// SDK 57's barrel eagerly loads push-token auto-registration, which throws in Android Expo Go.
// Keep this local-only facade pinned to the installed package's build paths; verify on SDK updates.
export {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export { getNotificationChannelAsync } from "expo-notifications/build/getNotificationChannelAsync";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { getAllScheduledNotificationsAsync } from "expo-notifications/build/getAllScheduledNotificationsAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export {
  AndroidImportance,
  type NotificationChannel,
} from "expo-notifications/build/NotificationChannelManager.types";
export {
  IosAuthorizationStatus,
  type NotificationPermissionsStatus,
} from "expo-notifications/build/NotificationPermissions.types";
export {
  SchedulableTriggerInputTypes,
  type Notification,
  type NotificationRequest,
} from "expo-notifications/build/Notifications.types";
