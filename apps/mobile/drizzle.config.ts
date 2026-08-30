import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  out: "./infrastructure/database/migrations",
  schema: "./infrastructure/database/schema.ts",
});
