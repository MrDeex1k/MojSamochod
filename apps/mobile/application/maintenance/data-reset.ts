export interface DataResetStore {
  isPending(): Promise<boolean>;
  markPending(): Promise<void>;
  eraseRecords(): Promise<void>;
  finish(): Promise<void>;
}

export type DataResetDependencies = Readonly<{
  store: DataResetStore;
  stopDataAccess: () => Promise<void>;
  stopScheduling: () => Promise<void>;
  cancelNotifications: () => Promise<void>;
  eraseFiles: () => Promise<void>;
}>;

/** Keeps reset intent durable until every private resource has been cleared. */
export class DataReset {
  private pending: Promise<void> | undefined;

  constructor(private readonly dependencies: DataResetDependencies) {}

  async resumeIfPending(): Promise<boolean> {
    if (!(await this.dependencies.store.isPending())) return false;
    await this.erase();
    return true;
  }

  erase(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.perform().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }

  private async perform(): Promise<void> {
    const { store, stopDataAccess, stopScheduling, cancelNotifications, eraseFiles } =
      this.dependencies;
    // Block new work immediately, then wait for already accepted writes and schedules.
    await Promise.all([stopDataAccess(), stopScheduling()]);
    await store.markPending();
    await cancelNotifications();
    await store.eraseRecords();
    await eraseFiles();
    await store.finish();
  }
}
