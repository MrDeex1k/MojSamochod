import { getLocales } from "expo-localization";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type {
  DocumentFilePicker,
  PickedDocument,
} from "@/infrastructure/documents/system-document-picker";
import { useAppTranslation } from "@/localization/use-app-translation";

export function DocumentForm({
  document,
  documents,
  embedded = false,
  entries,
  onCancel,
  onSaved,
  picker,
  vehicle,
}: Readonly<{
  document?: VehicleDocument;
  documents: VehicleDocumentService;
  embedded?: boolean;
  entries: readonly HistoryEntry[];
  onCancel: () => void;
  onSaved: () => void;
  picker: DocumentFilePicker;
  vehicle: Vehicle;
}>) {
  const { t } = useAppTranslation();
  const [file, setFile] = useState<PickedDocument | null>(null);
  const [name, setName] = useState(document?.name ?? "");
  const [date, setDate] = useState(document?.documentDate ?? "");
  const [amount, setAmount] = useState(
    document?.amount ? String(document.amount.minorUnits / 100) : "",
  );
  const [currency, setCurrency] = useState(
    document?.amount?.currency ?? getLocales()[0]?.currencyCode ?? "USD",
  );
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [entryId, setEntryId] = useState<string>(document?.historyEntryId ?? "");
  const [fileError, setFileError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chooseFile = async () => {
    setFileError(null);
    try {
      const result = await picker.pick();
      if (result.kind === "cancelled") return;
      if (result.kind === "invalid-size") {
        setFileError(t("documents.fileTooLarge"));
        return;
      }
      if (result.kind === "unsupported") {
        setFileError(t("documents.unsupportedFile"));
        return;
      }
      setFile(result.document);
      if (!name.trim()) setName(withoutExtension(result.document.name));
    } catch {
      setFileError(t("documents.pickError"));
    }
  };

  const save = async () => {
    if (saving) return;
    if (!name.trim()) {
      setNameError(t("documents.required"));
      return;
    }
    if (!document && !file) {
      setFileError(t("documents.fileRequired"));
      return;
    }
    setNameError(null);
    setFormError(null);
    setSaving(true);
    const selectedEntry = entries.find((entry) => entry.id === entryId);
    const metadata = {
      amount: parseAmount(amount, currency),
      documentDate: date,
      historyEntryId: selectedEntry?.id,
      name,
      notes,
    };
    const result = await (
      document
        ? documents.update(document, metadata)
        : documents.create(vehicle.id, file!, metadata)
    ).finally(() => setSaving(false));
    if (!result.ok) {
      setFormError(
        result.error.kind === "conflict" ? t("documents.duplicateError") : t("documents.saveError"),
      );
      return;
    }
    onSaved();
  };

  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t(document ? "documents.editTitle" : "documents.addTitle")}
      </Text>
      {!document ? (
        <View className="gap-compact">
          <Text className="text-label font-semibold text-primary">{t("documents.file")}</Text>
          <Button
            label={file?.name ?? t("documents.chooseFile")}
            onPress={() => void chooseFile()}
            variant="secondary"
          />
          {fileError ? <Text className="text-caption text-danger">{fileError}</Text> : null}
          <Text className="text-caption text-secondary">{t("documents.fileHelper")}</Text>
        </View>
      ) : null}
      <TextField
        error={nameError ?? undefined}
        label={t("documents.name")}
        onChangeText={setName}
        value={name}
      />
      <TextField
        autoCapitalize="none"
        helperText={t("documents.dateHelper")}
        label={t("documents.date")}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        value={date}
      />
      <View className="flex-row gap-compact">
        <View className="flex-[2]">
          <TextField
            keyboardType="decimal-pad"
            label={t("documents.amount")}
            onChangeText={setAmount}
            value={amount}
          />
        </View>
        <View className="flex-1">
          <TextField
            autoCapitalize="characters"
            label={t("documents.currency")}
            maxLength={3}
            onChangeText={(value) => setCurrency(value.toUpperCase())}
            value={currency}
          />
        </View>
      </View>
      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">{t("documents.relation")}</Text>
        <RelationOption
          label={t("documents.vehicleOnly")}
          onPress={() => setEntryId("")}
          selected={!entryId}
        />
        {entries.map((entry) => (
          <RelationOption
            key={entry.id}
            label={entryLabel(entry, t)}
            onPress={() => setEntryId(entry.id)}
            selected={entryId === entry.id}
          />
        ))}
      </View>
      <TextField label={t("documents.notes")} multiline onChangeText={setNotes} value={notes} />
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {formError}
        </Text>
      ) : null}
      <Button disabled={saving} label={t("documents.save")} onPress={() => void save()} />
      <Button
        label={t("documents.cancel")}
        onPress={() =>
          Alert.alert(t("documents.discardTitle"), t("documents.discardDescription"), [
            { style: "cancel", text: t("documents.keepEditing") },
            { onPress: onCancel, style: "destructive", text: t("documents.discard") },
          ])
        }
        variant="secondary"
      />
    </Card>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="grow" keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function RelationOption({
  label,
  onPress,
  selected,
}: Readonly<{ label: string; onPress: () => void; selected: boolean }>) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={`rounded-control border px-content py-control ${selected ? "border-accent bg-surface-strong" : "border-divider bg-surface-muted"}`}
      onPress={onPress}
    >
      <Text className="text-body text-primary">{label}</Text>
    </Pressable>
  );
}

function parseAmount(value: string, currency: string) {
  if (!value.trim()) return undefined;
  const normalized = value.trim().replace(",", ".");
  return {
    currency,
    minorUnits: /^\d+(?:\.\d{1,2})?$/.test(normalized)
      ? Math.round(Number(normalized) * 100)
      : Number.NaN,
  };
}

function withoutExtension(value: string): string {
  return value.replace(/\.[^.]+$/, "");
}

function entryLabel(entry: HistoryEntry, t: (key: string) => string): string {
  const subject =
    entry.type === "replacement"
      ? entry.details.item
      : entry.type === "repair"
        ? entry.details.subject
        : (entry.details.description ?? t(`entryForm.inspectionKinds.${entry.details.kind}`));
  return `${t(`workspace.entryType.${entry.type}`)} — ${subject}`;
}
