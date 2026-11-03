import { Host, FieldGroup, ListItem, Text } from "@expo/ui";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { Linking, Platform } from "react-native";
import { useAppTranslation } from "@/localization/use-app-translation";
import { nativeTheme, materialSeed } from "@/styles/native-theme";

export function SettingsScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t("navigation.settings") }} />
      <Host style={{ flex: 1 }} colorScheme="dark" seedColor={materialSeed}>
        <FieldGroup style={{ backgroundColor: nativeTheme.canvas }}>
          <FieldGroup.Section title={t("navigation.vehicle")}>
            <ListItem
              onPress={() =>
                router.push({ pathname: "/vehicle/editor", params: { kind: "vehicle-form" } })
              }
              supportingText={
                <Text textStyle={{ fontSize: 14, color: nativeTheme.secondary }}>
                  {t("settings.units")}
                </Text>
              }
              trailing={
                Platform.OS === "ios" ? (
                  <Text textStyle={{ color: nativeTheme.secondary }}>›</Text>
                ) : undefined
              }
            >
              <Text textStyle={{ fontSize: 17, fontWeight: "600" }}>
                {t("workspace.editVehicle")}
              </Text>
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
