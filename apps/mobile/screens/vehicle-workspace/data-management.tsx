import { useState } from "react";
import { Alert, Text } from "react-native";
import type { EraseAllData } from "@/application/storage/erase-all-data";
import { useFormExitGuard } from "@/components/layout/navigation-guard";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTranslation } from "@/localization/use-app-translation";

export function DataManagement({
  eraseData,
  onBack,
  onErased,
}: Readonly<{ eraseData: EraseAllData; onBack: () => void; onErased: () => void }>) {
  const { t } = useAppTranslation();
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  const back = useFormExitGuard(null, busy || started, onBack);
  const erase = async () => {
    setStarted(true);
    setBusy(true);
    setError(false);
    const result = await eraseData.erase();
    setBusy(false);
    if (result.ok) onErased();
    else setError(true);
  };
  const confirm = () =>
    Alert.alert(t("dataManagement.confirmTitle"), t("dataManagement.confirmDescription"), [
      { text: t("reminders.cancel"), style: "cancel" },
      {
        text: t("dataManagement.erase"),
        style: "destructive",
        onPress: () => {
          void erase();
        },
      },
    ]);
  return (
    <Screen>
      <Card>
        <Text accessibilityRole="header" className="text-title font-bold text-primary">
          {t("dataManagement.title")}
        </Text>
        <Text className="text-body text-secondary">{t("dataManagement.privacy")}</Text>
        <Text className="text-body text-secondary">{t("dataManagement.confirmDescription")}</Text>
        {error ? (
          <Text accessibilityRole="alert" className="text-body text-danger">
            {t("dataManagement.error")}
          </Text>
        ) : null}
        <Button
          disabled={busy}
          accessibilityState={{ busy }}
          variant="danger"
          label={t(
            busy
              ? "dataManagement.erasing"
              : started
                ? "database.errorAction"
                : "dataManagement.erase",
          )}
          onPress={
            started
              ? () => {
                  void erase();
                }
              : confirm
          }
        />
        <Button
          disabled={busy || started}
          label={t("documents.back")}
          variant="secondary"
          onPress={back}
        />
      </Card>
    </Screen>
  );
}
