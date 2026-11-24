import { InteractiveRow as Pressable } from "@/components/layout/interactive-row";
import type {
  HistoryEntryRepository,
  HistoryCursor,
  HistoryReferenceMatcher,
} from "@/application/repositories/history-entry-repository";
import type { VehicleId } from "@/domain/shared/identifiers";
import { createReferenceMatcher, referenceLabel } from "@/localization/history-reference-label";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Text, View } from "react-native";
import type { HistoryEntryReference } from "@/application/repositories/history-entry-repository";
import { ScreenFrame } from "@/components/layout/screen-frame";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAppTranslation } from "@/localization/use-app-translation";
import { formatUtcDateTime } from "@/localization/formatters";

/** Selects a history relation from repository search results or the supplied local entries. */
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
  const matches = useMemo(
    () => createReferenceMatcher(query, t, i18n.language),
    [query, t, i18n.language],
  );
  const results = useReferenceSearch(open, matches, historyEntries, vehicleId);
  const filtered = historyEntries?.searchReferences
    ? results.entries
    : open
      ? entries.filter(matches)
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
              testID="document-reference-results"
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

/**
 * Debounces reference search and exposes pages only for the current query and repository.
 * Query changes invalidate previous requests and prevent reuse of their pagination cursors.
 */
function useReferenceSearch(
  open: boolean,
  matches: HistoryReferenceMatcher,
  repository?: HistoryEntryRepository,
  vehicleId?: VehicleId,
) {
  const [entries, setEntries] = useState<readonly HistoryEntryReference[]>([]);
  const [cursor, setCursor] = useState<HistoryCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState<{
    matches: HistoryReferenceMatcher;
    vehicleId: VehicleId;
    repository: HistoryEntryRepository;
    attempt: number;
  } | null>(null);
  const currentSearch =
    open &&
    search?.matches === matches &&
    search?.vehicleId === vehicleId &&
    search?.repository === repository &&
    search?.attempt === attempt;
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    pending.current = false;
    if (!open || !vehicleId || !repository?.searchReferences) return;
    const timer = setTimeout(() => {
      setSearch({ matches, vehicleId, repository, attempt });
      setEntries([]);
      setCursor(null);
      setError(false);
      setLoading(true);
      void repository.searchReferences!(vehicleId, matches)
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
  }, [open, matches, repository, vehicleId, attempt]);
  const loadMore = () => {
    if (
      !currentSearch ||
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
      .searchReferences(vehicleId, matches, cursor)
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
  return {
    entries: currentSearch ? entries : [],
    loading: open && Boolean(repository?.searchReferences) && (!currentSearch || loading),
    error: currentSearch && error,
    loadMore,
    retry: () => setAttempt((value) => value + 1),
  };
}
