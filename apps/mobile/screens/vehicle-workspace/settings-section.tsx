import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTranslation } from "@/localization/use-app-translation";

const sections = ["free", "data", "permissions", "privacy", "units"] as const;

export function SettingsSection({
  embedded = false,
  onBack,
}: Readonly<{ embedded?: boolean; onBack: () => void }>) {
  const { t } = useAppTranslation();
  const content = (
    <View className="gap-content">
      <Text accessibilityRole="header" className="text-title font-semibold text-primary">
        {t("settings.title")}
      </Text>
      <Button label={t("settings.back")} onPress={onBack} variant="secondary" />
      {sections.map((section) => (
        <Card key={section}>
          <Text accessibilityRole="header" className="text-label font-semibold text-primary">
            {t(`settings.${section}.title`)}
          </Text>
          <Text className="text-body text-secondary">{t(`settings.${section}.body`)}</Text>
        </Card>
      ))}
    </View>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="pb-section">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
