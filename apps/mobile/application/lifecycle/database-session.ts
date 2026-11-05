type DatabaseHandle<T> = Readonly<{ database: T; close: () => Promise<void> }>;

/** A replacement connection cannot open until all owners of the preceding one have stopped. */
export class DatabaseSession<T = unknown> {
  readonly shutdownErrors: unknown[] = [];
  private readonly stoppers = new Set<() => Promise<void>>();
  private currentStop?: () => Promise<void>;
  private opened?: Promise<DatabaseHandle<T>>;
  private closing?: Promise<void>;
  private release!: () => void;
  private readonly predecessor: Promise<void>;
  private static tail: Promise<void> = Promise.resolve();

  constructor(private readonly initialize: () => Promise<DatabaseHandle<T>>) {
    this.predecessor = DatabaseSession.tail;
    DatabaseSession.tail = new Promise<void>((resolve) => {
      this.release = resolve;
    });
  }

  open(): Promise<DatabaseHandle<T>> {
    return (this.opened ??= this.predecessor.then(this.initialize));
  }

  register(stop: () => Promise<void>): Promise<void> {
    if (this.closing) throw new Error("Cannot register services on a closing connection");
    this.stoppers.add(stop);
    const previous = this.currentStop;
    this.currentStop = stop;
    return previous?.() ?? Promise.resolve();
  }

  close(): Promise<void> {
    return (this.closing ??= this.closeNow());
  }

  private async closeNow(): Promise<void> {
    try {
      const results = await Promise.allSettled([...this.stoppers].map((stop) => stop()));
      for (const result of results)
        if (result.status === "rejected") this.shutdownErrors.push(result.reason);
      const handle = await this.open().catch(() => undefined);
      await handle?.close();
    } finally {
      this.release();
    }
  }
}
