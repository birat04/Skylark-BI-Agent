import {
  pgTable,
  text,
  numeric,
  date,
  boolean,
  timestamp,
  serial,
  jsonb,
} from "drizzle-orm/pg-core";

export const workOrders = pgTable("work_orders", {
  id: text("id").primaryKey(), // monday.com item id
  name: text("name").notNull(), // monday item name = Serial # (unique, unlike deal name)
  status: text("status"), // normalized enum value
  rawStatus: text("raw_status"),
  sector: text("sector"), // normalized/canonical
  rawSector: text("raw_sector"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  // Fuzzy join key to deals. NOT a unique account/company identifier — it's the masked
  // deal name ("Sakura", "Naruto", ...), which repeats across multiple deals/work orders.
  // The two boards' own "code" fields (Customer Name Code / Client Code) do NOT overlap
  // at all, so this is the only viable cross-board link (see doc/decision-log.md).
  dealName: text("deal_name"),
  isIncomplete: boolean("is_incomplete").notNull().default(false),
  raw: jsonb("raw").notNull(), // full original column map, for audit/completeness
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
});

export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // monday item name = Deal Name
  stage: text("stage"),
  rawStage: text("raw_stage"),
  sector: text("sector"),
  rawSector: text("raw_sector"),
  value: numeric("value"),
  closeDate: date("close_date"),
  dealName: text("deal_name"),
  isIncomplete: boolean("is_incomplete").notNull().default(false),
  raw: jsonb("raw").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
});

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  boardsSynced: text("boards_synced").array(),
  rowsUpserted: numeric("rows_upserted"),
  rowsSkipped: numeric("rows_skipped"), // header-echo / unusable rows excluded from sync
  errors: jsonb("errors"),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type SyncRun = typeof syncRuns.$inferSelect;
