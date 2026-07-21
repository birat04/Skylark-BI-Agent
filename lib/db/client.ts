import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: PostgresJsDatabase<typeof schema> | null = null;

// Lazy singleton: fails at first query, not at module import — so `next build`'s
// page-data collection can load this module without DATABASE_URL set.
function getDb(): PostgresJsDatabase<typeof schema> {
  if (instance) return instance;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const queryClient = postgres(process.env.DATABASE_URL, { prepare: false });
  instance = drizzle(queryClient, { schema });
  return instance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
