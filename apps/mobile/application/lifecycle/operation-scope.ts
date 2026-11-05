/** Owns accepted asynchronous operations until they settle, even after their screen unmounts. */
export class OperationScope {
  private accepting = true;
  private readonly pending = new Set<Promise<unknown>>();

  track<T>(work: () => Promise<T>): Promise<T> {
    if (!this.accepting) return Promise.reject(new Error("Application services have stopped"));
    const operation = Promise.resolve().then(work);
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
