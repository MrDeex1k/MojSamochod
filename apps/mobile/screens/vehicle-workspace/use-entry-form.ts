import { useFormExitGuard } from "@/components/layout/navigation-guard";
import { repositoryFailure } from "@/application/repositories/repository-result";
import { getLocales } from "expo-localization";
import { useRef, useState } from "react";

import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";

import {
  createHistoryEntry,
  updateHistoryEntry,
  type CreateHistoryEntryInput,
  type HistoryEntry,
} from "@/domain/history/history-entry";
import type { Clock, IdGenerator } from "@/domain/shared/ports";
import type { ValidationIssue } from "@/domain/shared/result";
import { distanceToMetres, metresToDistance } from "@/domain/vehicle/distance";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import { formatCurrencyInputMinorUnits, parseCurrencyInput } from "@/localization/formatters";
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

export function useEntryForm({
  clock,
  entry,
  historyEntries,
  idGenerator,
  onCancel,
  onSaved,
  type,
  vehicle,
}: EntryFormProps) {
  const { t, i18n } = useAppTranslation();
  const [occurredAt, setOccurredAt] = useState(() =>
    toUtcMinute(new Date(entry?.occurredAt ?? clock.now())),
  );
  const [odometer, setOdometer] = useState(() => formatInitialOdometer(entry, vehicle));
  const odometerChanged = useRef(false);
  const [cost, setCost] = useState(() =>
    entry?.cost
      ? formatCurrencyInputMinorUnits(entry.cost.minorUnits, entry.cost.currency, i18n.language)
      : "",
  );
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
  const cancel = useFormExitGuard(
    {
      occurredAt,
      odometer,
      cost,
      currency,
      serviceProvider,
      notes,
      description,
      item,
      manufacturer,
      partNumber,
      subject,
      inspectionKind,
      inspectionResult,
    },
    saving,
    onCancel,
  );

  const input = (): CreateHistoryEntryInput => {
    const common = {
      cost: parseCost(cost, currency, i18n.language),
      notes,
      occurredAt: occurredAt.toISOString(),
      odometerMetres:
        entry && !odometerChanged.current ? entry.odometerMetres : parseOdometer(odometer, vehicle),
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
    )
      .catch((cause: unknown) => repositoryFailure("unavailable", "form.save", cause))
      .finally(() => setSaving(false));
    if (!result.ok) {
      setFormError(t("entryForm.saveError"));
      return;
    }
    onSaved(validated.value);
  };

  const changeOdometer = (value: string) => {
    setOdometer(value);
    odometerChanged.current = true;
  };
  return {
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
  };
}
function parseCost(value: string, currency: string, locale: string) {
  const parsed = parseCurrencyInput(value, currency, locale);
  if (parsed.kind === "empty") return undefined;
  return {
    currency,
    minorUnits: parsed.kind === "value" ? parsed.minorUnits : Number.NaN,
  };
}

function parseOdometer(value: string, vehicle: Vehicle): number | undefined {
  if (value.trim() === "") return undefined;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  const numeric = Number(value);
  return distanceToMetres(numeric, vehicle.distanceUnitPreference);
}

function formatInitialOdometer(entry: HistoryEntry | undefined, vehicle: Vehicle): string {
  if (entry?.odometerMetres === undefined) return "";
  return String(Math.round(metresToDistance(entry.odometerMetres, vehicle.distanceUnitPreference)));
}

function entryDescription(entry: HistoryEntry | undefined): string {
  if (entry?.type === "inspection" || entry?.type === "repair") {
    return entry.details.description ?? "";
  }
  return "";
}

function toUtcMinute(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      value.getUTCHours(),
      value.getUTCMinutes(),
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
