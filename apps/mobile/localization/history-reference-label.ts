import type {
  HistoryEntryReference,
  HistoryReferenceMatcher,
} from "@/application/repositories/history-entry-repository";
import type { HistoryEntry } from "@/domain/history/history-entry";

export function referenceLabel(
  entry: HistoryEntryReference | HistoryEntry,
  t: (key: string) => string,
) {
  let subject = "subject" in entry ? entry.subject : undefined;
  let inspectionKind = "inspectionKind" in entry ? entry.inspectionKind : undefined;
  if ("details" in entry) {
    subject =
      entry.type === "replacement"
        ? entry.details.item
        : entry.type === "repair"
          ? entry.details.subject
          : entry.details.description;
    if (entry.type === "inspection") inspectionKind = entry.details.kind;
  }
  return `${t(`workspace.entryType.${entry.type}`)} - ${subject ?? t(`entryForm.inspectionKinds.${inspectionKind ?? "other"}`)}`;
}

export function createReferenceMatcher(
  query: string,
  t: (key: string) => string,
  locale: string,
): HistoryReferenceMatcher {
  const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase(locale);
  const needle = normalize(query.trim());
  return (entry) => !needle || normalize(referenceLabel(entry, t)).includes(needle);
}
