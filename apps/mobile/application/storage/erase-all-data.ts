import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";

export const eraseStages = ["database", "files", "notifications"] as const;
export type EraseStage = (typeof eraseStages)[number];
type ResetResult = RepositoryResult<void>;

export interface EraseDataStorage {
  isPending(): Promise<boolean>;
  begin(): Promise<void>;
  clearDatabase(): Promise<void>;
  clearFiles(): Promise<void>;
  runStage(stage: EraseStage, work: () => Promise<void>): Promise<void>;
  finish(): Promise<void>;
}

export class EraseAllData {
  private pending: Promise<RepositoryResult<void>> | null = null;
  constructor(
    private readonly storage: EraseDataStorage,
    private readonly cancelNotifications: () => Promise<{ ok: boolean }>,
    private readonly exclusively: (work: () => Promise<ResetResult>) => Promise<ResetResult> = (
      work,
    ) => work(),
  ) {}

  erase(): Promise<RepositoryResult<void>> {
    return this.execute(true);
  }

  resume(): Promise<RepositoryResult<void>> {
    return this.execute(false);
  }

  private execute(begin: boolean): Promise<RepositoryResult<void>> {
    if (this.pending) return this.pending;
    const operation = this.run(begin);
    this.pending = operation;
    void operation.then(() => {
      this.pending = null;
    });
    return operation;
  }

  private async run(begin: boolean): Promise<RepositoryResult<void>> {
    try {
      if (!begin && !(await this.storage.isPending())) return repositorySuccess(undefined);
      return await this.exclusively(async () => {
        await this.storage.begin();
        const results = await Promise.allSettled([
          this.storage.runStage("database", () => this.storage.clearDatabase()),
          this.storage.runStage("files", () => this.storage.clearFiles()),
          this.storage.runStage("notifications", async () => {
            if (!(await this.cancelNotifications()).ok)
              throw new Error("Notification cleanup failed");
          }),
        ]);
        const failure = results.find((result) => result.status === "rejected");
        if (failure) return repositoryFailure("unavailable", "erase.data", failure.reason);
        await this.storage.finish();
        return repositorySuccess(undefined);
      });
    } catch (cause) {
      return repositoryFailure("unavailable", "erase.data", cause);
    }
  }
}
