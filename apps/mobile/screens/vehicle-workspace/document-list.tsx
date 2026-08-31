import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntry } from "@/domain/history/history-entry";
import { formatCalendarDate, formatCurrencyMinorUnits } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

export function DocumentList({
  documents,
  embedded = false,
  entries,
  onAdd,
  onBack,
  onSelect,
}: Readonly<{
  documents: readonly VehicleDocument[];
  embedded?: boolean;
  entries: readonly HistoryEntry[];
  onAdd: () => void;
  onBack: () => void;
  onSelect: (document: VehicleDocument) => void;
}>) {
  const { t, i18n } = useAppTranslation();
  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t("documents.title")}
      </Text>
      <Button label={`+ ${t("documents.add")}`} onPress={onAdd} />
      {documents.length === 0 ? (
        <View className="gap-compact py-content">
          <Text className="text-heading font-semibold text-primary">{t("documents.empty")}</Text>
          <Text className="text-body text-secondary">{t("documents.emptyDescription")}</Text>
        </View>
      ) : (
        <View>
          {documents.map((document) => {
            const entry = entries.find((candidate) => candidate.id === document.historyEntryId);
            return (
              <Pressable
                accessibilityLabel={document.name}
                accessibilityRole="button"
                className="gap-compact border-b border-divider py-control active:opacity-70"
                key={document.id}
                onPress={() => onSelect(document)}
              >
                <View className="flex-row justify-between gap-content">
                  <Text className="flex-1 text-body font-semibold text-primary">
                    {document.name}
                  </Text>
                  {document.documentDate ? (
                    <Text className="text-caption text-secondary">
                      {formatCalendarDate(document.documentDate, i18n.language)}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row flex-wrap gap-content">
                  {document.amount ? (
                    <Text className="text-caption text-secondary">
                      {formatCurrencyMinorUnits(
                        document.amount.minorUnits,
                        document.amount.currency,
                        i18n.language,
                      )}
                    </Text>
                  ) : null}
                  <Text className="text-caption text-secondary">
                    {entry ? t(`workspace.entryType.${entry.type}`) : t("documents.vehicleOnly")}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {!embedded ? (
        <Button label={t("documents.back")} onPress={onBack} variant="secondary" />
      ) : null}
    </Card>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}
