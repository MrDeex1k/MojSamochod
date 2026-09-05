import {
  repositoryFailure,
  repositorySuccess,
  type RepositoryResult,
} from "@/application/repositories/repository-result";

export interface EraseDataStorage {
  isPending(): Promise<boolean>;
  begin(): Promise<void>;
  clearDatabase(): Promise<void>;
  clearFiles(): Promise<void>;
  finish(): Promise<void>;
}

export class EraseAllData {
  private pending: Promise<RepositoryResult<void>> | null = null;
  constructor(
    private readonly storage: EraseDataStorage,
    private readonly cancelNotifications: () => Promise<{ ok: boolean }>,
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
      if (begin) await this.storage.begin();
      else if (!(await this.storage.isPending())) return repositorySuccess(undefined);
      await this.storage.clearDatabase();
      // Await the serialized reconciler, including older in-flight scheduling passes.
      const notifications = await this.cancelNotifications();
      if (!notifications.ok) return repositoryFailure("unavailable", "erase.notifications");
      await this.storage.clearFiles();
      await this.storage.finish();
      return repositorySuccess(undefined);
    } catch (cause) {
      return repositoryFailure("unavailable", "erase.data", cause);
    }
  }
}
