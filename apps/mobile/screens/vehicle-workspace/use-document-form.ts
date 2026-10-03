import type { HistoryEntryRepository } from "@/application/repositories/history-entry-repository";
import { historyEntryIdFromUuidV7 } from "@/domain/shared/identifiers";

import { documentDate } from "@/domain/documents/vehicle-document";
import { useFormExitGuard } from "@/components/layout/navigation-guard";
import { repositoryFailure } from "@/application/repositories/repository-result";
import { getLocales } from "expo-localization";
import { useState } from "react";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";

import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntryReference } from "@/application/repositories/history-entry-repository";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type {
  DocumentFilePicker,
  PickedDocument,
} from "@/infrastructure/documents/system-document-picker";
import { formatCurrencyInputMinorUnits, parseCurrencyInput } from "@/localization/formatters";
import { useAppTranslation } from "@/localization/use-app-translation";

export function useDocumentForm({
  document,
  documents,
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
    const metadata = {
      amount:
        parsedAmount.kind === "value"
          ? { currency, minorUnits: parsedAmount.minorUnits }
          : undefined,
      documentDate: date,
      historyEntryId: entryId ? historyEntryIdFromUuidV7(entryId) : undefined,
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

  return {
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
  };
}

function withoutExtension(value: string): string {
  return value.replace(/\.[^.]+$/, "");
}
