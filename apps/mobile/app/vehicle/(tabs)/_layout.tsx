import { MaterialNavigationRail } from "@/components/layout/material-navigation-rail";
import { Platform, View, useWindowDimensions } from "react-native";
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
        <MaterialNavigationRail
          labels={destinations.map(([, label]) => t(`navigation.${label}`))}
          selectedIndex={Math.max(
            0,
            destinations.findIndex(([name]) => pathname.endsWith(name)),
          )}
          onSelect={(index) => {
            const destination = destinations[index];
            if (destination) router.navigate(destination[2]);
          }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <NativeTabs
          hidden={sidebar}
          sidebarAdaptable={
            Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 18
              ? true
              : undefined
          }
          labelVisibilityMode={fontScale > 1.3 ? "selected" : "labeled"}
          indicatorColor={Platform.OS === "android" ? nativeTheme.surfaceStrong : undefined}
          rippleColor={
            Platform.OS === "android" ? `${nativeTheme.accent.slice(0, 7)}24` : undefined
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
