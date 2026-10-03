import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";

import { FormActions, FormTitle } from "@/components/layout/native-form";
import { DocumentEntrySelector } from "./document-entry-selector";
import { CalendarDateField } from "@/components/ui/calendar-date-field";

import { ScrollView, Text, View } from "react-native";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/ui/text-field";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntryReference } from "@/application/repositories/history-entry-repository";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type { DocumentFilePicker } from "@/infrastructure/documents/system-document-picker";

import { useDocumentForm } from "./use-document-form";

export function DocumentForm({
  document,
  documents,
  embedded = false,
  entries,
  historyEntries,
  onCancel,
  onSaved,
  picker,
  vehicle,
}: Readonly<{
  document?: VehicleDocument;
  documents: VehicleDocumentService;
  embedded?: boolean;
  entries: readonly HistoryEntryReference[];
  historyEntries?: HistoryEntryRepository;
  onCancel: () => void;
  onSaved: () => void;
  picker: DocumentFilePicker;
  vehicle: Vehicle;
}>) {
  const {
    t,
    file,
    name,
    setName,
    date,
    setDate,
    amount,
    setAmount,
    currency,
    setCurrency,
    notes,
    setNotes,
    entryId,
    setEntryId,
    fileError,
    dateError,
    setDateError,
    nameError,
    amountError,
    setAmountError,
    formError,
    saving,
    cancel,
    chooseFile,
    save,
  } = useDocumentForm({
    document,
    documents,
    embedded,
    entries,
    historyEntries,
    onCancel,
    onSaved,
    picker,
    vehicle,
  });
  const content = (
    <FormSection className={embedded ? "p-screen" : undefined}>
      <FormTitle>{t(document ? "documents.editTitle" : "documents.addTitle")}</FormTitle>
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
      <DocumentEntrySelector
        historyEntries={historyEntries}
        vehicleId={vehicle.id}
        entries={entries}
        selectedId={entryId}
        onSelect={setEntryId}
      />
      <TextField label={t("documents.notes")} multiline onChangeText={setNotes} value={notes} />
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {formError}
        </Text>
      ) : null}
      <FormActions
        busy={saving}
        saveLabel={t("documents.save")}
        cancelLabel={t("documents.cancel")}
        onSave={() => void save()}
        onCancel={cancel}
      />
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
