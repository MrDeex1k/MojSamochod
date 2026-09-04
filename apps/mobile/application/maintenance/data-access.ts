import { repositoryFailure } from "@/application/repositories/repository-result";

/** Guards application-facing async RepositoryResult methods, not native picker or UI methods. */
export class DataAccess {
  private stopped = false;
  private readonly active = new Set<Promise<unknown>>();

  async track<T>(action: () => Promise<T>, cancelled: T): Promise<T> {
    if (this.stopped) return cancelled;
    const operation = Promise.resolve().then(action);
    this.active.add(operation);
    try {
      return await operation;
    } finally {
      this.active.delete(operation);
    }
  }

  guard<T extends object>(service: T): T {
    const methods = new Map<PropertyKey, unknown>();
    return new Proxy(service, {
      get: (target, key) => {
        const value = Reflect.get(target, key, target);
        if (typeof value !== "function") return value;
        if (!methods.has(key))
          methods.set(key, (...args: unknown[]) => {
            if (this.stopped)
              return Promise.resolve(repositoryFailure("unavailable", "data.resetInProgress"));
            const operation = Promise.resolve().then(() => Reflect.apply(value, target, args));
            this.active.add(operation);
            void operation.then(
              () => this.active.delete(operation),
              () => this.active.delete(operation),
            );
            return operation;
          });
        return methods.get(key);
      },
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    await Promise.allSettled(this.active);
  }
}
