import { DocumentEntrySelector } from "./document-entry-selector";
import { CalendarDateField } from "@/components/ui/calendar-date-field";
import { documentDate } from "@/domain/documents/vehicle-document";
import { useFormExitGuard } from "@/components/layout/navigation-guard";
import { repositoryFailure } from "@/application/repositories/repository-result";
import { getLocales } from "expo-localization";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/ui/text-field";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type {
  DocumentFilePicker,
  PickedDocument,
} from "@/infrastructure/documents/system-document-picker";
import { formatCurrencyInputMinorUnits, parseCurrencyInput } from "@/localization/formatters";
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
  const { i18n, t } = useAppTranslation();
  const [file, setFile] = useState<PickedDocument | null>(null);
  const [name, setName] = useState(document?.name ?? "");
  const [date, setDate] = useState(document?.documentDate ?? "");
  const [amount, setAmount] = useState(
    document?.amount
      ? formatCurrencyInputMinorUnits(
          document.amount.minorUnits,
          document.amount.currency,
          i18n.language,
        )
      : "",
  );
  const [currency, setCurrency] = useState(
    document?.amount?.currency ?? getLocales()[0]?.currencyCode ?? "USD",
  );
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [entryId, setEntryId] = useState<string>(document?.historyEntryId ?? "");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cancel = useFormExitGuard(
    { file, name, date, amount, currency, notes, entryId },
    saving,
    onCancel,
  );

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
    if (!documentDate(date).ok) {
      setDateError(t("documents.invalidDate"));
      return;
    }
    setDateError(undefined);
    const parsedAmount = parseCurrencyInput(amount, currency, i18n.language);
    if (parsedAmount.kind === "invalid") {
      setAmountError(t("documents.invalidAmount"));
      return;
    }
    setNameError(null);
    setAmountError(null);
    setFormError(null);
    setSaving(true);
    const selectedEntry = entries.find((entry) => entry.id === entryId);
    const metadata = {
      amount:
        parsedAmount.kind === "value"
          ? { currency, minorUnits: parsedAmount.minorUnits }
          : undefined,
      documentDate: date,
      historyEntryId: selectedEntry?.id,
      name,
      notes,
    };
    const result = await (
      document
        ? documents.update(document, metadata)
        : documents.create(vehicle.id, file!, metadata)
    )
      .catch((cause: unknown) => repositoryFailure("unavailable", "form.save", cause))
      .finally(() => setSaving(false));
    if (!result.ok) {
      setFormError(
        result.error.kind === "conflict" ? t("documents.duplicateError") : t("documents.saveError"),
      );
      return;
    }
    onSaved();
  };

  const content = (
    <FormSection className={embedded ? "p-screen" : undefined}>
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
        maxLength={255}
        value={name}
      />
      <CalendarDateField
        label={t("documents.date")}
        value={date}
        onChange={(value) => {
          setDate(value);
          setDateError(undefined);
        }}
        error={dateError}
        disabled={saving}
      />
      <View className="flex-row gap-compact">
        <View className="flex-[2]">
          <TextField
            error={amountError ?? undefined}
            keyboardType="decimal-pad"
            label={t("documents.amount")}
            onChangeText={(value) => {
              setAmount(value);
              setAmountError(null);
            }}
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
      <DocumentEntrySelector entries={entries} selectedId={entryId} onSelect={setEntryId} />
      <TextField label={t("documents.notes")} multiline onChangeText={setNotes} value={notes} />
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {formError}
        </Text>
      ) : null}
      <Button busy={saving} label={t("documents.save")} onPress={() => void save()} />
      <Button label={t("documents.cancel")} onPress={cancel} variant="secondary" />
    </FormSection>
  );
  return embedded ? (
    <ScrollView
      contentContainerClassName="grow"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function withoutExtension(value: string): string {
  return value.replace(/\.[^.]+$/, "");
}
