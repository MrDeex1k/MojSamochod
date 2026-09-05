import { ListScreen } from "@/components/layout/list-screen";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
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
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  return (
    <ListScreen
      scrollKey="documents"
      embedded={embedded}
      data={documents}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="gap-content">
          <Text accessibilityRole="header" className="text-title font-bold text-primary">
            {t("documents.title")}
          </Text>
          <Button label={`+ ${t("documents.add")}`} onPress={onAdd} />
        </View>
      }
      ListEmptyComponent={
        <View className="gap-compact py-content">
          <Text className="text-heading font-semibold text-primary">{t("documents.empty")}</Text>
          <Text className="text-body text-secondary">{t("documents.emptyDescription")}</Text>
        </View>
      }
      ListFooterComponent={
        !embedded ? (
          <Button label={t("documents.back")} onPress={onBack} variant="secondary" />
        ) : null
      }
      renderItem={({ item: document }) => {
        const entry = document.historyEntryId
          ? entriesById.get(document.historyEntryId)
          : undefined;
        return (
          <Pressable
            accessibilityLabel={document.name}
            accessibilityRole="button"
            className="gap-compact border-b border-divider py-control active:opacity-70"
            key={document.id}
            onPress={() => onSelect(document)}
          >
            <View className="flex-row justify-between gap-content">
              <Text className="flex-1 text-body font-semibold text-primary">{document.name}</Text>
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
      }}
    />
  );
}
