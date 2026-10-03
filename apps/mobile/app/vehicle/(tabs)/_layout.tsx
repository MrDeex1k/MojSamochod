import { Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { useAppTranslation } from "@/localization/use-app-translation";
import { nativeTheme } from "@/styles/native-theme";
export default function TabsLayout() {
  const { t } = useAppTranslation();
  const { width, fontScale } = useWindowDimensions();
  const pathname = usePathname();
  const sidebar = Platform.OS === "android" && width >= Math.max(840, 680 * fontScale);
  const destinations = [
    ["overview", "vehicle", "/vehicle/(tabs)/overview"],
    ["fuel", "fuel", "/vehicle/(tabs)/fuel"],
    ["reminders", "reminders", "/vehicle/(tabs)/reminders"],
    ["settings", "settings", "/vehicle/(tabs)/settings"],
  ] as const;
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: nativeTheme.canvas }}>
      {sidebar ? (
        <View
          style={{
            width: Math.min(280, width * 0.24),
            padding: 16,
            gap: 8,
            borderRightWidth: 1,
            borderColor: nativeTheme.divider,
          }}
        >
          {destinations.map(([name, label, href]) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: pathname.endsWith(name) }}
              onPress={() => router.navigate(href)}
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: pathname.endsWith(name)
                  ? nativeTheme.surfaceStrong
                  : nativeTheme.canvas,
              }}
            >
              <Text style={{ color: nativeTheme.primary, fontSize: 16 }}>
                {t(`navigation.${label}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <NativeTabs
          hidden={sidebar}
          sidebarAdaptable={
            Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 18
              ? true
              : undefined
          }
          tintColor={nativeTheme.accent}
          backgroundColor={nativeTheme.canvas}
        >
          <NativeTabs.Trigger name="overview">
            <NativeTabs.Trigger.Icon sf="car.fill" md="directions_car" />
            <NativeTabs.Trigger.Label>{t("navigation.vehicle")}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="fuel">
            <NativeTabs.Trigger.Icon sf="fuelpump.fill" md="local_gas_station" />
            <NativeTabs.Trigger.Label>{t("navigation.fuel")}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="reminders">
            <NativeTabs.Trigger.Icon sf="calendar" md="event" />
            <NativeTabs.Trigger.Label>{t("navigation.reminders")}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="settings">
            <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
            <NativeTabs.Trigger.Label>{t("navigation.settings")}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </View>
    </View>
  );
}
