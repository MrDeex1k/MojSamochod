import { ChoiceField } from "@/components/ui/choice-field";
import { UtcDateTimeFields } from "@/components/ui/utc-date-time-fields";
import { FormGroup } from "@/components/ui/form-group";
import { FormActions, FormTitle } from "@/components/layout/native-form";

import { ScrollView, Text, View } from "react-native";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { Screen } from "@/components/layout/screen";
import { FormSection } from "@/components/ui/form-section";
import { TextField } from "@/components/ui/text-field";
import { type HistoryEntry } from "@/domain/history/history-entry";
import type { Clock, IdGenerator } from "@/domain/shared/ports";

import type { Vehicle } from "@/domain/vehicle/vehicle";

import { useAppTranslation } from "@/localization/use-app-translation";

type EntryType = HistoryEntry["type"];
type FieldErrors = Partial<Record<string, string>>;

type EntryFormProps = Readonly<{
  clock: Clock;
  embedded?: boolean;
  entry?: HistoryEntry;
  historyEntries: HistoryEntryRepository;
  idGenerator: IdGenerator;
  onCancel: () => void;
  onSaved: (entry?: HistoryEntry) => void;
  type: EntryType;
  vehicle: Vehicle;
}>;

import { useEntryForm } from "./use-entry-form";

export function EntryForm({
  clock,
  embedded = false,
  entry,
  historyEntries,
  idGenerator,
  onCancel,
  onSaved,
  type,
  vehicle,
}: EntryFormProps) {
  const {
    changeOdometer,
    t,
    occurredAt,
    setOccurredAt,
    odometer,
    cost,
    setCost,
    currency,
    setCurrency,
    serviceProvider,
    setServiceProvider,
    notes,
    setNotes,
    description,
    setDescription,
    item,
    setItem,
    manufacturer,
    setManufacturer,
    partNumber,
    setPartNumber,
    subject,
    setSubject,
    inspectionKind,
    setInspectionKind,
    inspectionResult,
    setInspectionResult,
    errors,
    formError,
    saving,
    cancel,
    save,
  } = useEntryForm({
    clock,
    embedded,
    entry,
    historyEntries,
    idGenerator,
    onCancel,
    onSaved,
    type,
    vehicle,
  });
  const content = (
    <FormSection className={embedded ? "p-screen" : undefined}>
      <FormTitle>{t(`entryForm.${entry ? "editTitle" : "title"}.${type}`)}</FormTitle>
      <FormGroup title={t("formGroups.event")}>
        <TypeSpecificFields
          description={description}
          errors={errors}
          inspectionKind={inspectionKind}
          inspectionResult={inspectionResult}
          item={item}
          manufacturer={manufacturer}
          partNumber={partNumber}
          setDescription={setDescription}
          setInspectionKind={setInspectionKind}
          setInspectionResult={setInspectionResult}
          setItem={setItem}
          setManufacturer={setManufacturer}
          setPartNumber={setPartNumber}
          setSubject={setSubject}
          subject={subject}
          type={type}
        />

        <UtcDateTimeFields
          value={occurredAt}
          onChange={setOccurredAt}
          maximumDate={clock.now()}
          error={errors.occurredAt}
        />
      </FormGroup>
      <FormGroup title={t("formGroups.odometer")}>
        <TextField
          error={errors.odometerMetres}
          helperText={t("entryForm.odometerHelper")}
          keyboardType="number-pad"
          label={t("entryForm.odometerLabel")}
          onChangeText={changeOdometer}
          value={odometer}
        />
      </FormGroup>
      <FormGroup title={t("formGroups.cost")}>
        <View className="flex-row gap-compact">
          <View className="flex-[2]">
            <TextField
              error={errors.cost}
              keyboardType="decimal-pad"
              label={t("entryForm.costLabel")}
              onChangeText={setCost}
              value={cost}
            />
          </View>
          <View className="flex-1">
            <TextField
              autoCapitalize="characters"
              error={errors.currency}
              label={t("entryForm.currencyLabel")}
              maxLength={3}
              onChangeText={(value) => setCurrency(value.toUpperCase())}
              value={currency}
            />
          </View>
        </View>
      </FormGroup>
      <FormGroup title={t("formGroups.details")}>
        <TextField
          label={t("entryForm.serviceProviderLabel")}
          onChangeText={setServiceProvider}
          value={serviceProvider}
        />
        <TextField
          label={t("entryForm.notesLabel")}
          multiline
          onChangeText={setNotes}
          value={notes}
        />
      </FormGroup>
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {formError}
        </Text>
      ) : null}
      <FormActions
        busy={saving}
        saveLabel={t("entryForm.save")}
        cancelLabel={t("entryForm.cancel")}
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

type TypeFieldsProps = Readonly<{
  description: string;
  errors: FieldErrors;
  inspectionKind: "technical" | "diagnostic" | "other";
  inspectionResult: "conditional" | "failed" | "not-recorded" | "passed";
  item: string;
  manufacturer: string;
  partNumber: string;
  setDescription: (value: string) => void;
  setInspectionKind: (value: "diagnostic" | "other" | "technical") => void;
  setInspectionResult: (value: "conditional" | "failed" | "not-recorded" | "passed") => void;
  setItem: (value: string) => void;
  setManufacturer: (value: string) => void;
  setPartNumber: (value: string) => void;
  setSubject: (value: string) => void;
  subject: string;
  type: EntryType;
}>;

function TypeSpecificFields(props: TypeFieldsProps) {
  const { t } = useAppTranslation();
  if (props.type === "inspection") {
    return (
      <View className="gap-content">
        <ChoiceField
          menu
          label={t("entryForm.inspectionKindLabel")}
          onSelect={props.setInspectionKind}
          options={[
            ["technical", t("entryForm.inspectionKinds.technical")],
            ["diagnostic", t("entryForm.inspectionKinds.diagnostic")],
            ["other", t("entryForm.inspectionKinds.other")],
          ]}
          value={props.inspectionKind}
        />
        <ChoiceField
          menu
          label={t("entryForm.inspectionResultLabel")}
          onSelect={props.setInspectionResult}
          options={[
            ["passed", t("entryForm.inspectionResults.passed")],
            ["failed", t("entryForm.inspectionResults.failed")],
            ["conditional", t("entryForm.inspectionResults.conditional")],
            ["not-recorded", t("entryForm.inspectionResults.not-recorded")],
          ]}
          value={props.inspectionResult}
        />
        <TextField
          label={t("entryForm.descriptionLabel")}
          onChangeText={props.setDescription}
          value={props.description}
        />
      </View>
    );
  }
  if (props.type === "replacement") {
    return (
      <View className="gap-content">
        <TextField
          error={props.errors.details}
          label={t("entryForm.itemLabel")}
          onChangeText={props.setItem}
          value={props.item}
        />
        <TextField
          label={t("entryForm.manufacturerLabel")}
          onChangeText={props.setManufacturer}
          value={props.manufacturer}
        />
        <TextField
          label={t("entryForm.partNumberLabel")}
          onChangeText={props.setPartNumber}
          value={props.partNumber}
        />
      </View>
    );
  }
  return (
    <View className="gap-content">
      <TextField
        error={props.errors.details}
        label={t("entryForm.subjectLabel")}
        onChangeText={props.setSubject}
        value={props.subject}
      />
      <TextField
        label={t("entryForm.descriptionLabel")}
        multiline
        onChangeText={props.setDescription}
        value={props.description}
      />
    </View>
  );
}
