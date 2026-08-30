import { Text, View } from "react-native";

import type { HistoryEntry } from "@/domain/history/history-entry";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppTranslation } from "@/localization/use-app-translation";

type EntryType = HistoryEntry["type"];

export function EntryTypeSelection({
  embedded = false,
  onCancel,
  onSelect,
}: Readonly<{
  embedded?: boolean;
  onCancel: () => void;
  onSelect: (type: EntryType) => void;
}>) {
  const { t } = useAppTranslation();
  const content = (
    <Card className={embedded ? "h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("entrySelection.title")}
      </Text>
      <Text className="text-body text-secondary">{t("entrySelection.description")}</Text>
      <View className="gap-content">
        <EntryTypeButton
          description={t("entrySelection.inspectionDescription")}
          label={t("workspace.entryType.inspection")}
          onPress={() => onSelect("inspection")}
        />
        <EntryTypeButton
          description={t("entrySelection.replacementDescription")}
          label={t("workspace.entryType.replacement")}
          onPress={() => onSelect("replacement")}
        />
        <EntryTypeButton
          description={t("entrySelection.repairDescription")}
          label={t("workspace.entryType.repair")}
          onPress={() => onSelect("repair")}
        />
      </View>
      <Button label={t("entrySelection.cancel")} onPress={onCancel} variant="secondary" />
    </Card>
  );

  return embedded ? content : <Screen contentClassName="justify-center">{content}</Screen>;
}

function EntryTypeButton({
  description,
  label,
  onPress,
}: Readonly<{ description: string; label: string; onPress: () => void }>) {
  return (
    <View className="gap-compact">
      <Button label={label} onPress={onPress} />
      <Text className="text-body text-secondary">{description}</Text>
    </View>
  );
}
