import { defineConfig } from "drizzle-kit";

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL?.trim();

if (!directDatabaseUrl) {
  throw new Error("DIRECT_DATABASE_URL is required to run Drizzle migrations.");
}

export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: directDatabaseUrl,
  },
});
