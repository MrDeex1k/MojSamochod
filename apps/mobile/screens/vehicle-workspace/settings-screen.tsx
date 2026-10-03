import { Host, FieldGroup, ListItem, Text } from "@expo/ui";
import Constants from "expo-constants";
import { Stack, router } from "expo-router";
import { Linking } from "react-native";
import { useAppTranslation } from "@/localization/use-app-translation";
import { nativeTheme } from "@/styles/native-theme";

export function SettingsScreen() {
  const { t } = useAppTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("navigation.settings") }} />
      <Host style={{ flex: 1 }} colorScheme="dark" seedColor={nativeTheme.accent}>
        <FieldGroup>
          <FieldGroup.Section title={t("navigation.vehicle")}>
            <ListItem
              onPress={() =>
                router.push({ pathname: "/vehicle/editor", params: { kind: "vehicle-form" } })
              }
              supportingText={t("settings.units")}
            >
              <Text>{t("workspace.editVehicle")}</Text>
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={t("settings.application")}>
            <ListItem supportingText={Constants.expoConfig?.version ?? "—"}>
              <Text>{t("settings.version")}</Text>
            </ListItem>
            <ListItem
              onPress={() => {
                void Linking.openSettings();
              }}
              supportingText={t("settings.systemLanguage")}
            >
              <Text>{t("settings.language")}</Text>
            </ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title={t("settings.privacy")}>
            <FieldGroup.SectionFooter>
              <Text>{t("dataManagement.privacy")}</Text>
            </FieldGroup.SectionFooter>
            <ListItem onPress={() => router.push("/vehicle/data-management")}>
              <Text>{t("dataManagement.title")}</Text>
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </>
  );
}
