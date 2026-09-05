import { PdfPreview } from "@/components/ui/pdf-preview";
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
import type { DocumentFilePicker } from "@/infrastructure/documents/system-document-picker";
import { formatCalendarDate, formatCurrencyMinorUnits } from "@/localization/formatters";
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
  vehicle: Vehicle;
}>) {
  const { t, i18n } = useAppTranslation();
  const [resolved, setResolved] = useState<{
    reference: string;
    file: ResolvedFile | null;
    failed: boolean;
  } | null>(null);
  const file = resolved?.reference === document.fileReference ? resolved.file : null;
  const loadingFile = resolved?.reference !== document.fileReference;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formattedAmount = document.amount
    ? formatCurrencyMinorUnits(document.amount.minorUnits, document.amount.currency, i18n.language)
    : null;

  useEffect(() => {
    let active = true;
    void documents
      .getFile(document)
      .then((result) => {
        if (active) {
          setResolved({
            reference: document.fileReference,
            file: result.ok ? result.value : null,
            failed: !result.ok || !result.value,
          });
        }
      })
      .catch(() => {
        if (active) setResolved({ reference: document.fileReference, file: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [document, documents, t]);

  const replace = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void picker
      .pick()
      .then((picked) => {
        if (picked.kind === "cancelled") return;
        if (picked.kind === "invalid-size") {
          setError(t("documents.fileTooLarge"));
          return;
        }
        if (picked.kind === "unsupported") {
          setError(t("documents.unsupportedFile"));
          return;
        }
        return documents.replace(document, picked.document).then((result) => {
          if (result.ok) onChanged();
          else {
            setError(
              result.error.kind === "conflict"
                ? t("documents.duplicateError")
                : t("documents.replaceError"),
            );
          }
        });
      })
      .catch(() => setError(t("documents.replaceError")))
      .finally(() => setBusy(false));
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
      ) : file?.mimeType === "application/pdf" ? (
        <PdfPreview key={document.fileReference} uri={file.uri} name={document.name} />
      ) : (
        <View className="items-center rounded-control bg-surface-muted p-section">
          <Text className="text-heading font-semibold text-primary">PDF</Text>
          <Text className="text-caption text-secondary">
            {file?.name ?? t(loadingFile ? "documents.loading" : "documents.fileMissing")}
          </Text>
        </View>
      )}
      <View className="gap-compact border-t border-divider pt-content">
        {document.documentDate ? (
          <DetailRow
            label={t("documents.date")}
            value={formatCalendarDate(document.documentDate, i18n.language, "long")}
          />
        ) : null}
        {formattedAmount ? (
          <DetailRow label={t("documents.amount")} value={formattedAmount} />
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
        disabled={busy}
        label={t("documents.replace")}
        onPress={replace}
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
    <ScrollView
      contentContainerClassName="grow"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
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

function entryLabel(entry: HistoryEntry, t: (key: string) => string): string {
  return t(`workspace.entryType.${entry.type}`);
}
