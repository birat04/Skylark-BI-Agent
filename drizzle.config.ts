import { defineConfig } from "drizzle-kit";

// `generate` only diffs against lib/db/schema.ts and needs no live connection —
// only `migrate`/`push`/`studio` actually connect, so those are where a missing
// DATABASE_URL should surface as a real failure, not here.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
