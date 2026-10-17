import { Host, ListItem, Text } from "@expo/ui";
import { Column, Icon, Text as MaterialText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, padding } from "@expo/ui/jetpack-compose/modifiers";
import Constants from "expo-constants";
import { Stack, router } from "expo-router";
import type { PropsWithChildren } from "react";
import { Linking, ScrollView } from "react-native";
import { useAppTranslation } from "@/localization/use-app-translation";
import { materialSeed, nativeTheme } from "@/styles/native-theme";

function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Column modifiers={[fillMaxWidth()]}>
      <MaterialText
        modifiers={[padding(16, 24, 16, 8)]}
        color={nativeTheme.accent}
        style={{ typography: "titleSmall" }}
      >
        {title}
      </MaterialText>
      {children}
    </Column>
  );
}

function SettingsRow({
  title,
  description,
  value,
  onPress,
}: Readonly<{ title: string; description?: string; value?: string; onPress?: () => void }>) {
  return (
    <ListItem
      onPress={onPress}
      colors={{ containerColor: nativeTheme.canvas }}
      supportingText={description}
      trailing={
        onPress ? (
          <Icon source={require("../../assets/material/next.xml")} size={20} />
        ) : value ? (
          <Text textStyle={{ color: nativeTheme.secondary }}>{value}</Text>
        ) : undefined
      }
    >
      <Text>{title}</Text>
    </ListItem>
  );
}

export function SettingsScreen() {
  const { t } = useAppTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("navigation.settings") }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: nativeTheme.canvas }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <Host
          style={{ width: "100%", maxWidth: 768 }}
          colorScheme="dark"
          seedColor={materialSeed}
          matchContents={{ vertical: true }}
        >
          <Column modifiers={[fillMaxWidth()]}>
            <SettingsSection title={t("navigation.vehicle")}>
              <SettingsRow
                title={t("workspace.editVehicle")}
                description={t("settings.units")}
                onPress={() =>
                  router.push({ pathname: "/vehicle/editor", params: { kind: "vehicle-form" } })
                }
              />
            </SettingsSection>
            <SettingsSection title={t("settings.application")}>
              <SettingsRow
                title={t("settings.version")}
                value={Constants.expoConfig?.version ?? "—"}
              />
              <SettingsRow
                title={t("settings.language")}
                description={t("settings.systemLanguage")}
                onPress={() => {
                  void Linking.openSettings();
                }}
              />
            </SettingsSection>
            <SettingsSection title={t("settings.privacy")}>
              <SettingsRow
                title={t("dataManagement.title")}
                onPress={() => router.push("/vehicle/data-management")}
              />
              <MaterialText
                modifiers={[padding(16, 8, 16, 0)]}
                color={nativeTheme.secondary}
                style={{ typography: "bodyMedium" }}
              >
                {t("dataManagement.privacy")}
              </MaterialText>
            </SettingsSection>
          </Column>
        </Host>
      </ScrollView>
    </>
  );
}
