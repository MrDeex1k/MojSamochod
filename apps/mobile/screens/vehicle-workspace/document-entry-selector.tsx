import type {
  HistoryEntryRepository,
  HistoryCursor,
} from "@/application/repositories/history-entry-repository";
import type { VehicleId } from "@/domain/shared/identifiers";
import type { HistoryEntry } from "@/domain/history/history-entry";
import { useEffect, useRef, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import type { HistoryEntryReference } from "@/application/repositories/history-entry-repository";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAppTranslation } from "@/localization/use-app-translation";
import { formatUtcDateTime } from "@/localization/formatters";

export function DocumentEntrySelector({
  entries,
  historyEntries,
  vehicleId,
  selectedId,
  onSelect,
}: {
  entries: readonly HistoryEntryReference[];
  historyEntries?: HistoryEntryRepository;
  vehicleId?: VehicleId;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t, i18n } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = (entry: HistoryEntryReference) => referenceLabel(entry, t);
  const [selection, setSelection] = useState<HistoryEntryReference>();
  const selected =
    entries.find((entry) => entry.id === selectedId) ??
    (selection?.id === selectedId ? selection : undefined);
  const results = useReferenceSearch(open, query, historyEntries, vehicleId);
  const filtered = historyEntries?.searchReferences
    ? results.entries
    : open
      ? entries.filter((entry) =>
          label(entry)
            .toLocaleLowerCase(i18n.language)
            .includes(query.trim().toLocaleLowerCase(i18n.language)),
        )
      : [];
  const choose = (id: string) => {
    setSelection(filtered.find((entry) => entry.id === id));
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
              onEndReached={results.loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                results.loading ? (
                  <Text className="p-content text-secondary">{t("workspace.loading")}</Text>
                ) : results.error ? (
                  <Button label={t("database.errorAction")} onPress={results.retry} />
                ) : undefined
              }
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

function referenceLabel(entry: HistoryEntryReference | HistoryEntry, t: (key: string) => string) {
  let subject = "subject" in entry ? entry.subject : undefined;
  let inspectionKind = "inspectionKind" in entry ? entry.inspectionKind : undefined;
  if ("details" in entry) {
    subject =
      entry.type === "replacement"
        ? entry.details.item
        : entry.type === "repair"
          ? entry.details.subject
          : entry.details.description;
    if (entry.type === "inspection") inspectionKind = entry.details.kind;
  }
  return `${t(`workspace.entryType.${entry.type}`)} - ${subject ?? t(`entryForm.inspectionKinds.${inspectionKind ?? "other"}`)}`;
}

function useReferenceSearch(
  open: boolean,
  query: string,
  repository?: HistoryEntryRepository,
  vehicleId?: VehicleId,
) {
  const [entries, setEntries] = useState<readonly HistoryEntryReference[]>([]);
  const [cursor, setCursor] = useState<HistoryCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    pending.current = false;
    if (!open || !vehicleId || !repository?.searchReferences) return;
    const timer = setTimeout(() => {
      setEntries([]);
      setCursor(null);
      setError(false);
      setLoading(true);
      void repository.searchReferences!(vehicleId, query)
        .then((result) => {
          if (current !== generation.current) return;
          if (!result.ok) {
            setError(true);
            return;
          }
          setEntries(result.value.entries);
          setCursor(result.value.nextCursor);
        })
        .catch(() => {
          if (current === generation.current) setError(true);
        })
        .finally(() => {
          if (current === generation.current) setLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      generation.current = current + 1;
    };
  }, [open, query, repository, vehicleId, attempt]);
  const loadMore = () => {
    if (
      !cursor ||
      loading ||
      pending.current ||
      error ||
      !vehicleId ||
      !repository?.searchReferences
    )
      return;
    pending.current = true;
    setLoading(true);
    const current = generation.current;
    void repository
      .searchReferences(vehicleId, query, cursor)
      .then((result) => {
        if (current !== generation.current) return;
        if (!result.ok) {
          setError(true);
          return;
        }
        setEntries((previous) => [...previous, ...result.value.entries]);
        setCursor(result.value.nextCursor);
      })
      .catch(() => {
        if (current === generation.current) setError(true);
      })
      .finally(() => {
        if (current === generation.current) {
          pending.current = false;
          setLoading(false);
        }
      });
  };
  return { entries, loading, error, loadMore, retry: () => setAttempt((value) => value + 1) };
}
