import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import type { VehicleDocumentService } from "@/application/documents/vehicle-document-service";
import { Screen } from "@/components/layout/screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import type { VehicleDocument } from "@/domain/documents/vehicle-document";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { Vehicle } from "@/domain/vehicle/vehicle";
import type { DocumentPresenter } from "@/infrastructure/documents/native-document-presenter";
import type { DocumentFilePicker } from "@/infrastructure/documents/system-document-picker";
import { useAppTranslation } from "@/localization/use-app-translation";

type ResolvedFile = Readonly<{ mimeType: string; name: string; uri: string }>;

export function DocumentDetail({
  document,
  documents,
  embedded = false,
  entries,
  onBack,
  onChanged,
  onEdit,
  picker,
  presenter,
  vehicle,
}: Readonly<{
  document: VehicleDocument;
  documents: VehicleDocumentService;
  embedded?: boolean;
  entries: readonly HistoryEntry[];
  onBack: () => void;
  onChanged: () => void;
  onEdit: () => void;
  picker: DocumentFilePicker;
  presenter: DocumentPresenter;
  vehicle: Vehicle;
}>) {
  const { t, i18n } = useAppTranslation();
  const [file, setFile] = useState<ResolvedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void documents.getFile(document).then((result) => {
      if (active) {
        if (result.ok) setFile(result.value);
        else setError(t("documents.fileMissing"));
      }
    });
    return () => {
      active = false;
    };
  }, [document, documents, t]);

  const share = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await presenter.share(file))) setError(t("documents.shareUnavailable"));
    } catch {
      setError(t("documents.shareError"));
    } finally {
      setBusy(false);
    }
  };

  const replace = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const picked = await picker.pick();
      if (picked.kind === "cancelled") return;
      if (picked.kind === "invalid-size") {
        setError(t("documents.fileTooLarge"));
        return;
      }
      if (picked.kind === "unsupported") {
        setError(t("documents.unsupportedFile"));
        return;
      }
      const result = await documents.replace(document, picked.document);
      if (result.ok) onChanged();
      else {
        setError(
          result.error.kind === "conflict"
            ? t("documents.duplicateError")
            : t("documents.replaceError"),
        );
      }
    } catch {
      setError(t("documents.replaceError"));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      t("documents.deleteTitle", { name: document.name }),
      t("documents.deleteDescription"),
      [
        { style: "cancel", text: t("documents.cancel") },
        {
          onPress: () => {
            setBusy(true);
            setError(null);
            void documents
              .delete(vehicle.id, document.id)
              .then((result) => (result.ok ? onChanged() : setError(t("documents.deleteError"))))
              .catch(() => setError(t("documents.deleteError")))
              .finally(() => setBusy(false));
          },
          style: "destructive",
          text: t("documents.delete"),
        },
      ],
    );
  };

  const relatedEntry = entries.find((entry) => entry.id === document.historyEntryId);
  const content = (
    <Card className={embedded ? "min-h-full" : undefined}>
      <Text className="text-label font-semibold uppercase tracking-widest text-accent">
        {t("documents.document")}
      </Text>
      <Text accessibilityRole="header" className="text-title font-bold text-primary">
        {document.name}
      </Text>
      {file?.mimeType.startsWith("image/") ? (
        <View className="aspect-square w-full overflow-hidden rounded-control bg-surface-muted">
          <Image
            accessibilityLabel={document.name}
            className="h-full w-full"
            contentFit="contain"
            source={{ uri: file.uri }}
          />
        </View>
      ) : (
        <View className="items-center rounded-control bg-surface-muted p-section">
          <Text className="text-heading font-semibold text-primary">PDF</Text>
          <Text className="text-caption text-secondary">
            {file?.name ?? t("documents.fileMissing")}
          </Text>
        </View>
      )}
      <View className="gap-compact border-t border-divider pt-content">
        {document.documentDate ? (
          <DetailRow
            label={t("documents.date")}
            value={formatDate(document.documentDate, i18n.language)}
          />
        ) : null}
        {document.amount ? (
          <DetailRow
            label={t("documents.amount")}
            value={new Intl.NumberFormat(i18n.language, {
              currency: document.amount.currency,
              style: "currency",
            }).format(document.amount.minorUnits / 100)}
          />
        ) : null}
        <DetailRow
          label={t("documents.relation")}
          value={relatedEntry ? entryLabel(relatedEntry, t) : t("documents.vehicleOnly")}
        />
        {document.notes ? <DetailRow label={t("documents.notes")} value={document.notes} /> : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-body text-danger">
          {error}
        </Text>
      ) : null}
      <Button
        disabled={!file || busy}
        label={
          file?.mimeType === "application/pdf" ? t("documents.openPdf") : t("documents.export")
        }
        onPress={() => void share()}
      />
      <Button
        disabled={busy}
        label={t("documents.replace")}
        onPress={() => void replace()}
        variant="secondary"
      />
      <Button disabled={busy} label={t("documents.edit")} onPress={onEdit} variant="secondary" />
      <Button
        className="w-1/2 self-start"
        disabled={busy}
        label={t("documents.delete")}
        onPress={confirmDelete}
        variant="danger"
      />
      {!embedded ? (
        <Button label={t("documents.back")} onPress={onBack} variant="secondary" />
      ) : null}
    </Card>
  );
  return embedded ? (
    <ScrollView contentContainerClassName="grow">{content}</ScrollView>
  ) : (
    <Screen>{content}</Screen>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View className="flex-row justify-between gap-content py-compact">
      <Text className="flex-1 text-body text-secondary">{label}</Text>
      <Text className="flex-1 text-right text-body text-primary">{value}</Text>
    </View>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function entryLabel(entry: HistoryEntry, t: (key: string) => string): string {
  return t(`workspace.entryType.${entry.type}`);
}
