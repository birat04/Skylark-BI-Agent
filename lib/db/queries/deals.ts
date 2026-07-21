import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { deals } from "@/lib/db/schema";
import { staleCaveat } from "@/lib/monday/freshness";

export interface DealFilter {
  sector?: string;
  stage?: string;
  closeDateFrom?: string;
  closeDateTo?: string;
}

export interface QuerySummary {
  count: number;
  totalValue: number | null; // null when every matching row has a missing value
  rowsMissingValue: number;
}

export interface QueryResult<T, S = QuerySummary> {
  data: T[];
  summary: S;
  caveats: string[];
  syncedAt: string | null;
}

// Hard cap on rows returned to the model regardless of how many rows matched —
// see the comment at the bottom of queryDeals for why this exists.
export const MAX_ROWS_RETURNED = 20;

// Deliberately excludes `raw` (the full monday.com column dump) and per-row
// `syncedAt` (a native Date object, redundant with the top-level syncedAt below) —
// both are pure token waste for the model and the Date instance breaks the AI SDK's
// internal ModelMessage schema validation on the tool-result round-trip (confirmed
// via a minimal repro; see doc/decision-log.md).
const DEAL_TOOL_COLUMNS = {
  id: deals.id,
  name: deals.name,
  stage: deals.stage,
  rawStage: deals.rawStage,
  sector: deals.sector,
  rawSector: deals.rawSector,
  value: deals.value,
  closeDate: deals.closeDate,
  dealName: deals.dealName,
  isIncomplete: deals.isIncomplete,
};

export interface DealRow {
  id: string;
  name: string;
  stage: string | null;
  rawStage: string | null;
  sector: string | null;
  rawSector: string | null;
  value: string | null;
  closeDate: string | null;
  dealName: string | null;
  isIncomplete: boolean;
}

export async function queryDeals(filter: DealFilter): Promise<QueryResult<DealRow>> {
  const conditions = [];
  if (filter.sector) conditions.push(eq(deals.sector, filter.sector));
  if (filter.stage) conditions.push(eq(deals.stage, filter.stage));
  if (filter.closeDateFrom) conditions.push(gte(deals.closeDate, filter.closeDateFrom));
  if (filter.closeDateTo) conditions.push(lte(deals.closeDate, filter.closeDateTo));
  const where = conditions.length ? and(...conditions) : undefined;

  // Aggregates are computed in SQL, never left for the model to sum over raw rows —
  // a real failure observed live: the model tried to hand-sum 111 row values and got
  // it wrong by >10x. See doc/rule.md §6 and doc/decision-log.md.
  const [rows, syncedAtRows, aggregateRows] = await Promise.all([
    db.select(DEAL_TOOL_COLUMNS).from(deals).where(where),
    db.select({ syncedAt: deals.syncedAt }).from(deals).limit(1),
    db
      .select({
        count: sql<number>`count(*)`,
        totalValue: sql<string | null>`sum(${deals.value}::numeric)`,
        rowsMissingValue: sql<number>`count(*) filter (where ${deals.value} is null)`,
      })
      .from(deals)
      .where(where),
  ]);

  const incompleteCount = rows.filter((row) => row.isIncomplete).length;
  const caveats: string[] = [];
  if (incompleteCount > 0) {
    caveats.push(
      `${incompleteCount} of ${rows.length} matching deals have missing fields (see raw_* columns) and may be undercounted in aggregates.`
    );
  }

  const agg = aggregateRows[0];
  const summary: QuerySummary = {
    count: Number(agg?.count ?? 0),
    totalValue: agg?.totalValue !== null && agg?.totalValue !== undefined ? Number(agg.totalValue) : null,
    rowsMissingValue: Number(agg?.rowsMissingValue ?? 0),
  };

  const syncedAt = syncedAtRows.length > 0 ? syncedAtRows[0].syncedAt.toISOString() : null;
  const staleness = staleCaveat(syncedAt);
  if (staleness) caveats.push(staleness);

  // Full, uncapped row set — callers that need every row for their own computation
  // (e.g. lib/ai/tools/join-deals-work-orders.ts) call this function directly.
  // The row cap for what actually reaches the model lives at the tool boundary
  // (lib/ai/tools/query-deals.ts), not here — see doc/decision-log.md.
  return { data: rows, summary, caveats, syncedAt };
}
