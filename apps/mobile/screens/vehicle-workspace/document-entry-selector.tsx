import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import type { HistoryEntry } from "@/domain/history/history-entry";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAppTranslation } from "@/localization/use-app-translation";
import { formatUtcDateTime } from "@/localization/formatters";

export function DocumentEntrySelector({
  entries,
  selectedId,
  onSelect,
}: {
  entries: readonly HistoryEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t, i18n } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = (entry: HistoryEntry) => {
    const subject =
      entry.type === "replacement"
        ? entry.details.item
        : entry.type === "repair"
          ? entry.details.subject
          : (entry.details.description ?? t(`entryForm.inspectionKinds.${entry.details.kind}`));
    return `${t(`workspace.entryType.${entry.type}`)} - ${subject}`;
  };
  const selected = entries.find((entry) => entry.id === selectedId);
  const filtered = entries.filter((entry) =>
    label(entry)
      .toLocaleLowerCase(i18n.language)
      .includes(query.trim().toLocaleLowerCase(i18n.language)),
  );
  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery("");
  };
  return (
    <View className="gap-compact">
      <Text className="text-label font-semibold text-primary">{t("documents.relation")}</Text>
      <Button
        accessibilityLabel={t("documents.chooseRelation")}
        label={selected ? label(selected) : t("documents.vehicleOnly")}
        onPress={() => setOpen(true)}
        variant="secondary"
      />
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaProvider>
          <ScreenFrame standalone>
            <View className="gap-content px-screen py-content">
              <Text accessibilityRole="header" className="text-title font-semibold text-primary">
                {t("documents.relation")}
              </Text>
              <Button
                label={t("documents.cancel")}
                onPress={() => setOpen(false)}
                variant="secondary"
              />
              <TextField
                label={t("documents.searchEntries")}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListHeaderComponent={
                <Button
                  label={t("documents.vehicleOnly")}
                  onPress={() => choose("")}
                  variant="secondary"
                />
              }
              ListEmptyComponent={
                <Text className="py-content text-body text-secondary">
                  {t("documents.noMatchingEntries")}
                </Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: item.id === selectedId }}
                  accessibilityLabel={`${label(item)}, ${formatUtcDateTime(item.occurredAt, i18n.language)}`}
                  onPress={() => choose(item.id)}
                  className="gap-compact border-b border-divider py-content"
                >
                  <Text className="text-body font-semibold text-primary">{label(item)}</Text>
                  <Text className="text-caption text-secondary">
                    {formatUtcDateTime(item.occurredAt, i18n.language)}
                  </Text>
                </Pressable>
              )}
            />
          </ScreenFrame>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
