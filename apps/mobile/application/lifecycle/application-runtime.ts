import type { RepositoryResult } from "@/application/repositories/repository-result";
import { OperationScope } from "./operation-scope";

export type RuntimeDiagnostic = Readonly<{
  stage: "recovery" | "cleanup" | "shutdown";
  cause: unknown;
}>;

export class ApplicationRuntime {
  readonly operations = new OperationScope();
  readonly diagnostics: RuntimeDiagnostic[] = [];
  private disposed = false;
  private starting?: Promise<RepositoryResult<void>>;
  private stopping?: Promise<void>;
  private unsubscribe?: () => void;

  constructor(
    private readonly dependencies: {
      resume: () => Promise<RepositoryResult<void>>;
      recover: (ready: () => void) => Promise<RepositoryResult<void>>;
      startSchedule: () => () => void;
      stopSchedule: () => Promise<void>;
    },
  ) {}

  start(onReady: () => void): Promise<RepositoryResult<void>> {
    return (this.starting ??= this.startNow(onReady));
  }

  private async startNow(onReady: () => void): Promise<RepositoryResult<void>> {
    if (this.disposed) return { ok: true, value: undefined };
    let recovered = false;
    try {
      const resumed = await this.dependencies.resume();
      if (!resumed.ok) {
        this.diagnostics.push({ stage: "recovery", cause: resumed.error });
        return resumed;
      }
      if (this.disposed) return { ok: true, value: undefined };
      const result = await this.dependencies.recover(() => {
        recovered = true;
        if (this.disposed) return;
        this.unsubscribe = this.dependencies.startSchedule();
        onReady();
      });
      if (!result.ok)
        this.diagnostics.push({ stage: recovered ? "cleanup" : "recovery", cause: result.error });
      return result;
    } catch (cause) {
      this.diagnostics.push({ stage: recovered ? "cleanup" : "recovery", cause });
      return { ok: false, error: { kind: "unavailable", operation: "application.start", cause } };
    }
  }

  stop(): Promise<void> {
    this.disposed = true;
    this.unsubscribe?.();
    return (this.stopping ??= this.stopNow());
  }

  private async stopNow(): Promise<void> {
    await this.operations.stop();
    await this.starting;
    await this.dependencies.stopSchedule();
  }
}
