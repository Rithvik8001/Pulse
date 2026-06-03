import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationDatabaseUrl!,
  },
  strict: true,
  verbose: true,
});
