import type { HistoryCursor } from "@/application/repositories/history-entry-repository";
import type { HistoryEntry } from "@/domain/history/history-entry";
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
  private cursor: HistoryCursor | null = null;
  private relatedEntries: readonly HistoryEntry[] | null = null;
  private tail: Promise<unknown> = Promise.resolve();
  private data: WorkspaceData | null = null;
  private readonly loaded = new Set<string>();

  constructor(private readonly services: ApplicationServices) {}

  invalidate(section: WorkspaceSection) {
    this.loaded.delete(section);
    if (section === "history") {
      this.loaded.delete("documents");
      this.relatedEntries = null;
    }
    if (section !== "documents") this.loaded.delete("vehicle");
  }

  load(section: WorkspaceSection) {
    const next = this.tail.then(() => this.loadSection(section));
    this.tail = next;
    return next;
  }

  async loadMore() {
    const next = this.tail.then(async () => {
      if (!this.data || !this.cursor || !this.services.historyEntries.listPage) return;
      const page = unwrap(
        await this.services.historyEntries.listPage(this.data.vehicle.id, this.cursor),
      );
      this.data = { ...this.data, entries: [...this.data.entries, ...page.entries] };
      this.cursor = page.nextCursor;
    });
    this.tail = next.catch(() => undefined);
    await next;
  }

  hasMore() {
    return this.cursor !== null;
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
      if (section === "history" && !this.loaded.has("history")) {
        let page = this.services.historyEntries.listPage
          ? unwrap(await this.services.historyEntries.listPage(vehicle.id))
          : {
              entries: unwrap(await this.services.historyEntries.list(vehicle.id)),
              nextCursor: null,
            };
        const targetCount = this.data.entries.length;
        while (
          page.nextCursor &&
          page.entries.length < targetCount &&
          this.services.historyEntries.listPage
        ) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          const next = unwrap(
            await this.services.historyEntries.listPage(vehicle.id, page.nextCursor),
          );
          page = { entries: [...page.entries, ...next.entries], nextCursor: next.nextCursor };
        }
        this.data = { ...this.data, entries: page.entries };
        this.cursor = page.nextCursor;
        this.loaded.add("history");
      }
      if (section === "documents" && !this.relatedEntries)
        this.relatedEntries = unwrap(await this.services.historyEntries.list(vehicle.id));
      if (section === "documents" && !this.loaded.has("documents")) {
        this.data = {
          ...this.data,
          documents: unwrap(await this.services.documents.list(vehicle.id)),
        };
        this.loaded.add("documents");
      }
      if (section === "fuel" && !this.loaded.has("fuel")) {
        this.data = {
          ...this.data,
          refuellingHistory: unwrap(await this.services.refuellings.list(vehicle.id)),
        };
        this.loaded.add("fuel");
      }
      return {
        status: "ready",
        data:
          section === "documents"
            ? { ...this.data, entries: this.relatedEntries ?? [] }
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
