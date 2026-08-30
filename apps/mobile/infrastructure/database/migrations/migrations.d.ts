type MigrationBundle = {
  journal: {
    entries: Array<{
      breakpoints: boolean;
      idx: number;
      tag: string;
      version: string;
      when: number;
    }>;
    version: string;
    dialect: string;
  };
  migrations: Record<string, string>;
};

declare const migrations: MigrationBundle;

export default migrations;
