import { useCallback, useState } from "react";
import { Host } from "@expo/ui";
import { Column, ModalBottomSheet, FilledTonalButton, Text } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, paddingAll, verticalScroll } from "@expo/ui/jetpack-compose/modifiers";
import { Stack, useFocusEffect } from "expo-router";
import type { HistoryEntry } from "@/domain/history/history-entry";
import { materialSeed } from "@/styles/native-theme";
import { useAppTranslation } from "@/localization/use-app-translation";
export function EntryTypeSelection({
  onCancel,
  onSelect,
}: {
  embedded?: boolean;
  onCancel: () => void;
  onSelect: (type: HistoryEntry["type"]) => void;
}) {
  const { t } = useAppTranslation();
  const [presented, setPresented] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setPresented(true);
    }, []),
  );
  const choose = (type: HistoryEntry["type"]) => {
    setPresented(false);
    onSelect(type);
  };
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {presented ? (
        <Host colorScheme="dark" seedColor={materialSeed}>
          <ModalBottomSheet onDismissRequest={onCancel} skipPartiallyExpanded>
            <Column
              modifiers={[fillMaxWidth(), verticalScroll(), paddingAll(24)]}
              verticalArrangement={{ spacedBy: 16 }}
            >
              <Text style={{ typography: "headlineSmall" }}>{t("entrySelection.title")}</Text>
              <Text>{t("entrySelection.description")}</Text>
              {(["inspection", "replacement", "repair"] as const).map((type) => (
                <Column key={type} verticalArrangement={{ spacedBy: 8 }}>
                  <FilledTonalButton onClick={() => choose(type)} modifiers={[fillMaxWidth()]}>
                    <Text>{t(`workspace.entryType.${type}`)}</Text>
                  </FilledTonalButton>
                  <Text>{t(`entrySelection.${type}Description`)}</Text>
                </Column>
              ))}
            </Column>
          </ModalBottomSheet>
        </Host>
      ) : null}
    </>
  );
}
