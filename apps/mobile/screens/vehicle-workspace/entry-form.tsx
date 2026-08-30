import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { getLocales } from "expo-localization";
import { useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import {
  createHistoryEntry,
  updateHistoryEntry,
  type CreateHistoryEntryInput,
  type HistoryEntry,
} from "@/domain/history/history-entry";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import type { ValidationIssue } from "@/domain/shared/result";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { useAppTranslation } from "@/localization/use-app-translation";

type EntryType = HistoryEntry["type"];
type PickerMode = "date" | "time" | null;
type FieldErrors = Partial<Record<string, string>>;

type EntryFormProps = Readonly<{
  clock: Clock;
  embedded?: boolean;
  entry?: HistoryEntry;
  historyEntries: HistoryEntryRepository;
  idGenerator: IdGenerator;
  onCancel: () => void;
  onSaved: () => void;
  type: EntryType;
  vehicle: Vehicle;
}>;

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
  const { t, i18n } = useAppTranslation();
  const [occurredAt, setOccurredAt] = useState(() => new Date(entry?.occurredAt ?? clock.now()));
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [odometer, setOdometer] = useState(() => formatInitialOdometer(entry, vehicle));
  const [cost, setCost] = useState(() => (entry?.cost ? String(entry.cost.minorUnits / 100) : ""));
  const [currency, setCurrency] = useState(
    entry?.cost?.currency ?? getLocales()[0]?.currencyCode ?? "USD",
  );
  const [serviceProvider, setServiceProvider] = useState(entry?.serviceProvider ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [description, setDescription] = useState(() => entryDescription(entry));
  const [item, setItem] = useState(entry?.type === "replacement" ? entry.details.item : "");
  const [manufacturer, setManufacturer] = useState(
    entry?.type === "replacement" ? (entry.details.manufacturer ?? "") : "",
  );
  const [partNumber, setPartNumber] = useState(
    entry?.type === "replacement" ? (entry.details.partNumber ?? "") : "",
  );
  const [subject, setSubject] = useState(entry?.type === "repair" ? entry.details.subject : "");
  const [inspectionKind, setInspectionKind] = useState(
    entry?.type === "inspection" ? entry.details.kind : "technical",
  );
  const [inspectionResult, setInspectionResult] = useState(
    entry?.type === "inspection" ? entry.details.result : "not-recorded",
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const input = (): CreateHistoryEntryInput => {
    const common = {
      cost: parseCost(cost, currency),
      notes,
      occurredAt: occurredAt.toISOString(),
      odometerMetres: parseOdometer(odometer, vehicle),
      serviceProvider,
      vehicleId: vehicle.id,
    };
    if (type === "inspection") {
      return {
        ...common,
        details: { description, kind: inspectionKind, result: inspectionResult },
        type,
      };
    }
    if (type === "replacement") {
      return { ...common, details: { item, manufacturer, partNumber }, type };
    }
    return { ...common, details: { description, subject }, type };
  };

  const save = async () => {
    if (saving) return;
    setFormError(null);
    const validated = entry
      ? updateHistoryEntry(entry, input(), clock)
      : createHistoryEntry(input(), { clock, idGenerator });
    if (!validated.ok) {
      setErrors(mapIssues(validated.issues, t));
      return;
    }
    setErrors({});
    setSaving(true);
    const result = await (
      entry ? historyEntries.update(validated.value) : historyEntries.create(validated.value)
    ).finally(() => setSaving(false));
    if (!result.ok) {
      setFormError(t("entryForm.saveError"));
      return;
    }
    onSaved();
  };

  const cancel = () => {
    Alert.alert(t("entryForm.discardTitle"), t("entryForm.discardDescription"), [
      { style: "cancel", text: t("entryForm.keepEditing") },
      { onPress: onCancel, style: "destructive", text: t("entryForm.discardChanges") },
    ]);
  };

  const content = (
    <Card className={embedded ? "h-full" : undefined}>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {t(`entryForm.title.${type}`)}
      </Text>
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

      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">{t("entryForm.dateLabel")}</Text>
        <Button
          label={formatDate(occurredAt, i18n.language)}
          onPress={() => setPickerMode("date")}
          variant="secondary"
        />
        {errors.occurredAt ? (
          <Text className="text-caption text-danger">{errors.occurredAt}</Text>
        ) : null}
      </View>
      <View className="gap-compact">
        <Text className="text-label font-semibold text-primary">{t("entryForm.timeLabel")}</Text>
        <Button
          label={formatTime(occurredAt, i18n.language)}
          onPress={() => setPickerMode("time")}
          variant="secondary"
        />
      </View>
      {pickerMode ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "compact" : "default"}
          maximumDate={clock.now()}
          mode={pickerMode}
          onChange={(event, selected) => {
            handleDateTimeChange(event, selected, pickerMode, occurredAt, setOccurredAt);
            setPickerMode(null);
          }}
          timeZoneName="UTC"
          value={occurredAt}
        />
      ) : null}

      <TextField
        error={errors.odometerMetres}
        helperText={t("entryForm.odometerHelper")}
        keyboardType="number-pad"
        label={t("entryForm.odometerLabel")}
        onChangeText={setOdometer}
        value={odometer}
      />
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
      {formError ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {formError}
        </Text>
      ) : null}
      <Button disabled={saving} label={t("entryForm.save")} onPress={() => void save()} />
      <Button label={t("entryForm.cancel")} onPress={cancel} variant="secondary" />
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

type TypeFieldsProps = Readonly<{
  description: string;
  errors: FieldErrors;
  inspectionKind: string;
  inspectionResult: string;
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

function ChoiceField<T extends string>({
  label,
  onSelect,
  options,
  value,
}: Readonly<{
  label: string;
  onSelect: (value: T) => void;
  options: readonly (readonly [T, string])[];
  value: string;
}>) {
  return (
    <View className="gap-compact">
      <Text className="text-label font-semibold text-primary">{label}</Text>
      <View className="flex-row flex-wrap gap-compact">
        {options.map(([option, optionLabel]) => (
          <Button
            key={option}
            label={optionLabel}
            onPress={() => onSelect(option)}
            variant={value === option ? "primary" : "secondary"}
          />
        ))}
      </View>
    </View>
  );
}

function parseCost(value: string, currency: string) {
  if (value.trim() === "") return undefined;
  const normalized = value.trim().replace(",", ".");
  const valid = /^\d+(?:\.\d{1,2})?$/.test(normalized);
  return { currency, minorUnits: valid ? Math.round(Number(normalized) * 100) : Number.NaN };
}

function parseOdometer(value: string, vehicle: Vehicle): number | undefined {
  if (value.trim() === "") return undefined;
  const numeric = Number(value);
  return vehicle.distanceUnitPreference === "miles"
    ? Math.round(numeric * 1609.344)
    : numeric * 1000;
}

function formatInitialOdometer(entry: HistoryEntry | undefined, vehicle: Vehicle): string {
  if (entry?.odometerMetres === undefined) return "";
  const divisor = vehicle.distanceUnitPreference === "miles" ? 1609.344 : 1000;
  return String(Math.round(entry.odometerMetres / divisor));
}

function entryDescription(entry: HistoryEntry | undefined): string {
  if (entry?.type === "inspection" || entry?.type === "repair") {
    return entry.details.description ?? "";
  }
  return "";
}

function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(value);
}

function formatTime(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

function handleDateTimeChange(
  event: DateTimePickerEvent,
  selected: Date | undefined,
  mode: Exclude<PickerMode, null>,
  current: Date,
  setValue: (value: Date) => void,
) {
  if (event.type === "dismissed" || !selected) return;
  if (mode === "date") {
    setValue(
      new Date(
        Date.UTC(
          selected.getUTCFullYear(),
          selected.getUTCMonth(),
          selected.getUTCDate(),
          current.getUTCHours(),
          current.getUTCMinutes(),
        ),
      ),
    );
    return;
  }
  setValue(
    new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate(),
        selected.getUTCHours(),
        selected.getUTCMinutes(),
      ),
    ),
  );
}

function mapIssues(issues: readonly ValidationIssue[], t: (key: string) => string): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    if (issue.field === "occurredAt") errors.occurredAt = t("entryForm.futureError");
    else if (issue.field === "odometerMetres") {
      errors.odometerMetres = t("entryForm.invalidOdometerError");
    } else if (issue.field.startsWith("cost.")) {
      errors.cost = t("entryForm.invalidCostError");
    } else if (issue.field === "details.item" || issue.field === "details.subject") {
      errors.details = t("entryForm.requiredError");
    }
  }
  return errors;
}
