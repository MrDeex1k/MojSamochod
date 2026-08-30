import { useRouter } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useAppTranslation } from "@/localization/use-app-translation";

export function FirstVehicleSetupScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();

  return (
    <Screen contentClassName="items-center justify-center">
      <Card className="w-full max-w-md">
        <Text className="text-label font-semibold uppercase tracking-widest text-accent">
          {t("common.appName")}
        </Text>
        <Text className="text-display font-bold text-primary">{t("firstVehicle.title")}</Text>
        <Text className="text-body text-secondary">{t("firstVehicle.description")}</Text>
        <TextField
          label={t("firstVehicle.makeLabel")}
          placeholder={t("firstVehicle.makePlaceholder")}
        />
        <Button label={t("firstVehicle.nextAction")} onPress={() => router.push("/vehicle")} />
      </Card>
    </Screen>
  );
}
