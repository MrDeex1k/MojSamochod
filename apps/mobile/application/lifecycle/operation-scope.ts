/** Owns accepted asynchronous operations until they settle, even after their screen unmounts. */
export class OperationScope {
  private accepting = true;
  private exclusive = false;
  private readonly pending = new Set<Promise<unknown>>();

  track<T>(work: () => Promise<T>): Promise<T> {
    if (!this.accepting || this.exclusive)
      return Promise.reject(new Error("Application services have stopped"));
    return this.own(Promise.resolve().then(work));
  }

  /** Drain existing work before erasing. A failed reset admits only another reset. */
  async reset<T extends { ok: boolean }>(work: () => Promise<T>): Promise<T> {
    if (!this.accepting) throw new Error("Application services have stopped");
    this.exclusive = true;
    const drained = Promise.allSettled(this.pending);
    return this.own(
      drained.then(work).then((result) => {
        if (result.ok) this.exclusive = false;
        return result;
      }),
    );
  }

  private own<T>(operation: Promise<T>): Promise<T> {
    this.pending.add(operation);
    void operation.then(
      () => this.pending.delete(operation),
      () => this.pending.delete(operation),
    );
    return operation;
  }

  wrap<T extends object>(service: T): T {
    return new Proxy(service, {
      get: (target, key) => {
        const value = Reflect.get(target, key);
        return typeof value === "function"
          ? (...args: unknown[]) => this.track(() => Reflect.apply(value, target, args))
          : value;
      },
    });
  }

  async stop(): Promise<void> {
    this.accepting = false;
    await Promise.allSettled(this.pending);
  }
}
