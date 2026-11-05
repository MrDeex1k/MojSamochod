import type { DocumentCursor } from "@/application/repositories/vehicle-document-repository";
import type { HistoryEntry } from "@/domain/history/history-entry";
import type { HistoryEntryId } from "@/domain/shared/identifiers";
import type {
  HistoryCursor,
  HistoryEntryReference,
} from "@/application/repositories/history-entry-repository";
import type { ApplicationServices } from "@/components/providers/application-provider";
import type { RepositoryResult } from "@/application/repositories/repository-result";
import type { WorkspaceData, WorkspaceMode } from "./workspace-types";

export type WorkspaceSection = "history" | "documents" | "fuel" | "reminders";

export function workspaceSection(mode: WorkspaceMode): WorkspaceSection {
  if (mode.kind.startsWith("document")) return "documents";
  if (mode.kind.startsWith("refuelling") || mode.kind === "fuel") return "fuel";
  if (mode.kind === "vehicle-form") return mode.returnTo;
  if (mode.kind === "reminders") return "reminders";
  return "history";
}

export class WorkspaceDataSource {
  private documentCursor: DocumentCursor | null = null;
  private fuelCursor: HistoryCursor | null = null;
  private cursor: HistoryCursor | null = null;
  private relatedEntries: readonly HistoryEntryReference[] | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private data: WorkspaceData | null = null;
  private readonly loaded = new Set<string>();
  private readonly pendingPages = new Map<WorkspaceSection, Promise<void>>();

  constructor(private readonly services: ApplicationServices) {}

  invalidate(section: WorkspaceSection) {
    // Apply after in-flight reads so they cannot mark invalidated data as loaded again.
    this.tail = this.tail.then(() => {
      this.loaded.delete(section);
      if (section === "reminders") this.loaded.delete("upcoming");
      if (section === "documents" || section === "history") this.loaded.delete("counts");
      if (section === "history") {
        this.loaded.delete("documents");
        this.relatedEntries = null;
      }
      if (section !== "documents") this.loaded.delete("vehicle");
    });
  }

  async changedHistory(entry?: HistoryEntry, deletedId?: HistoryEntryId) {
    const next = this.tail.then(() => {
      this.loaded.delete("vehicle");
      this.loaded.delete("documents");
      this.loaded.delete("counts");
      this.relatedEntries = null;
      if (!this.data || !this.loaded.has("history")) return;
      const id = entry?.id ?? deletedId;
      let entries = this.data.entries.filter((value) => value.id !== id);
      // The previous keyset boundary remains valid even when its record moves or is deleted.
      // A record moved beyond it belongs to a later page and must not appear twice.
      if (entry && (!this.cursor || compareHistory(entry, this.cursor) <= 0))
        entries = [...entries, entry].sort(compareHistory);
      this.data = { ...this.data, entries };
    });
    this.tail = next.catch(() => undefined);
    await next;
  }

  load(section: WorkspaceSection) {
    const next = this.tail.then(() => this.loadSection(section));
    this.tail = next;
    return next;
  }

  loadMore(section: WorkspaceSection = "history") {
    const pending = this.pendingPages.get(section);
    if (pending) return pending;
    const next = this.tail
      .then(async () => {
        if (!this.loaded.has(section)) return;
        if (section === "documents") {
          if (!this.data || !this.documentCursor) return;
          const page = unwrap(
            await this.services.documents.listPage(this.data.vehicle.id, this.documentCursor),
          );
          const documents = [...this.data.documents, ...page.documents];
          const knownIds = new Set(this.relatedEntries?.map(({ id }) => id));
          const ids = [
            ...new Set(
              page.documents.flatMap(({ historyEntryId }) =>
                historyEntryId && !knownIds.has(historyEntryId) ? [historyEntryId] : [],
              ),
            ),
          ];
          const entries = this.services.historyEntries.references
            ? [
                ...(this.relatedEntries ?? []),
                ...(ids.length
                  ? unwrap(await this.services.historyEntries.references(this.data.vehicle.id, ids))
                  : []),
              ]
            : unwrap(await this.services.historyEntries.list(this.data.vehicle.id));
          this.relatedEntries = entries;
          this.data = { ...this.data, documents, relatedEntries: entries };
          this.documentCursor = page.nextCursor;
          return;
        }
        if (section === "fuel") {
          if (!this.data || !this.fuelCursor) return;
          const page = unwrap(
            await this.services.refuellings.listPage(this.data.vehicle.id, this.fuelCursor),
          );
          this.data = {
            ...this.data,
            refuellingHistory: {
              ...this.data.refuellingHistory,
              refuellings: [...this.data.refuellingHistory.refuellings, ...page.refuellings],
            },
          };
          this.fuelCursor = page.nextCursor;
          return;
        }
        if (!this.data || !this.cursor || !this.services.historyEntries.listPage) return;
        const page = unwrap(
          await this.services.historyEntries.listPage(this.data.vehicle.id, this.cursor),
        );
        this.data = { ...this.data, entries: [...this.data.entries, ...page.entries] };
        this.cursor = page.nextCursor;
        this.loaded.delete("counts");
      })
      .finally(() => {
        this.pendingPages.delete(section);
      });
    this.pendingPages.set(section, next);
    this.tail = next.catch(() => undefined);
    return next;
  }

  hasMore(section: WorkspaceSection = "history") {
    return section === "documents"
      ? this.documentCursor !== null
      : section === "fuel"
        ? this.fuelCursor !== null
        : section === "history" && this.cursor !== null;
  }

  private async loadSection(
    section: WorkspaceSection,
  ): Promise<{ status: "ready"; data: WorkspaceData } | { status: "missing" | "error" }> {
    try {
      if (!this.loaded.has("vehicle")) {
        const vehicle = unwrap(await this.services.vehicles.get());
        if (!vehicle) return { status: "missing" };
        this.data = {
          documents: [],
          entries: [],
          photoUri: null,
          refuellingHistory: {
            consumption: {
              includedRefuellingIds: [],
              intervals: [],
              totalDistanceMetres: 0,
              totalFuelMicrolitres: 0,
              unanchoredRefuellingIds: [],
            },
            refuellings: [],
          },
          ...this.data,
          vehicle,
        };
        const photo = vehicle.photoReference
          ? await this.services.managedFiles.getReadyUri(vehicle.photoReference)
          : null;
        this.data = { ...this.data, photoUri: photo?.ok ? photo.value : null };
        this.loaded.add("vehicle");
      }
      if (!this.data) return { status: "missing" };
      const vehicle = this.data.vehicle;
      if (section === "history" && !this.loaded.has("upcoming") && this.services.reminders) {
        const reminders = unwrap(await this.services.reminders.list(vehicle.id));
        const nextReminder = [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
        this.data = { ...this.data, nextReminder };
        this.loaded.add("upcoming");
      }
      if (section === "history" && !this.loaded.has("history")) {
        const targetCount = this.data.entries.length;
        const initialLimit = targetCount > 0 ? Math.min(targetCount, 100) : 50;
        let page = this.services.historyEntries.listPage
          ? unwrap(await this.services.historyEntries.listPage(vehicle.id, undefined, initialLimit))
          : {
              entries: unwrap(await this.services.historyEntries.list(vehicle.id)),
              nextCursor: null,
            };
        while (
          page.nextCursor &&
          page.entries.length < targetCount &&
          this.services.historyEntries.listPage
        ) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          const next = unwrap(
            await this.services.historyEntries.listPage(
              vehicle.id,
              page.nextCursor,
              Math.min(targetCount - page.entries.length, 100),
            ),
          );
          page = { entries: [...page.entries, ...next.entries], nextCursor: next.nextCursor };
        }
        this.data = { ...this.data, entries: page.entries };
        this.cursor = page.nextCursor;
        this.loaded.add("history");
      }
      if (section === "documents" && !this.loaded.has("documents")) {
        const target = Math.max(50, this.data.documents.length);
        let page = this.services.documents.listPage
          ? unwrap(await this.services.documents.listPage(vehicle.id))
          : { documents: unwrap(await this.services.documents.list(vehicle.id)), nextCursor: null };
        while (page.nextCursor && page.documents.length < target) {
          const next = unwrap(
            await this.services.documents.listPage(
              vehicle.id,
              page.nextCursor,
              Math.min(100, target - page.documents.length),
            ),
          );
          page = { documents: [...page.documents, ...next.documents], nextCursor: next.nextCursor };
        }
        this.documentCursor = page.nextCursor;
        this.data = { ...this.data, documents: page.documents };
        const ids = [
          ...new Set(
            this.data.documents.flatMap((document) =>
              document.historyEntryId ? [document.historyEntryId] : [],
            ),
          ),
        ];
        this.relatedEntries = this.services.historyEntries.references
          ? unwrap(await this.services.historyEntries.references(vehicle.id, ids))
          : unwrap(await this.services.historyEntries.list(vehicle.id));
        this.loaded.add("documents");
      }
      if (section === "history" && !this.loaded.has("counts")) {
        if (this.services.documents.attachmentCounts) {
          this.data = {
            ...this.data,
            attachmentCounts: unwrap(
              await this.services.documents.attachmentCounts(
                vehicle.id,
                this.data.entries.map((entry) => entry.id),
              ),
            ),
          };
        } else {
          this.data = {
            ...this.data,
            documents: unwrap(await this.services.documents.list(vehicle.id)),
          };
        }
        this.loaded.add("counts");
      }
      if (section === "fuel" && !this.loaded.has("fuel")) {
        if (this.services.refuellings.listPage) {
          const target = this.data.refuellingHistory.refuellings.length;
          let page = unwrap(await this.services.refuellings.listPage(vehicle.id));
          const refuellings = [...page.refuellings];
          while (page.nextCursor && refuellings.length < target) {
            page = unwrap(await this.services.refuellings.listPage(vehicle.id, page.nextCursor));
            refuellings.push(...page.refuellings);
          }
          const consumption = unwrap(await this.services.refuellings.consumption(vehicle.id));
          this.data = {
            ...this.data,
            refuellingHistory: { consumption, refuellings },
          };
          this.fuelCursor = page.nextCursor;
        } else {
          this.data = {
            ...this.data,
            refuellingHistory: unwrap(await this.services.refuellings.list(vehicle.id)),
          };
        }
        this.loaded.add("fuel");
      }
      return {
        status: "ready",
        data:
          section === "documents"
            ? { ...this.data, relatedEntries: this.relatedEntries ?? [] }
            : this.data,
      };
    } catch {
      return { status: "error" };
    }
  }
}

function unwrap<T>(result: RepositoryResult<T>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

function compareHistory(left: HistoryCursor, right: HistoryCursor) {
  return (
    right.occurredAt.localeCompare(left.occurredAt) ||
    right.createdAt.localeCompare(left.createdAt) ||
    left.id.localeCompare(right.id)
  );
}
