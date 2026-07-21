import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { workOrders } from "@/lib/db/schema";
import type { QueryResult } from "@/lib/db/queries/deals";
import { staleCaveat } from "@/lib/monday/freshness";

export interface WorkOrderFilter {
  sector?: string;
  status?: string;
}

export interface WorkOrderRow {
  id: string;
  name: string;
  status: string | null;
  rawStatus: string | null;
  sector: string | null;
  rawSector: string | null;
  startDate: string | null;
  dueDate: string | null;
  dealName: string | null;
  isIncomplete: boolean;
}

export interface WorkOrderSummary {
  count: number;
  statusBreakdown: { status: string | null; count: number }[];
}

// Same exclusions as lib/db/queries/deals.ts (`raw`, per-row `syncedAt`) — see
// doc/decision-log.md for why a native Date object here broke tool-result validation.
const WORK_ORDER_TOOL_COLUMNS = {
  id: workOrders.id,
  name: workOrders.name,
  status: workOrders.status,
  rawStatus: workOrders.rawStatus,
  sector: workOrders.sector,
  rawSector: workOrders.rawSector,
  startDate: workOrders.startDate,
  dueDate: workOrders.dueDate,
  dealName: workOrders.dealName,
  isIncomplete: workOrders.isIncomplete,
};

export async function queryWorkOrders(
  filter: WorkOrderFilter
): Promise<QueryResult<WorkOrderRow, WorkOrderSummary>> {
  const conditions = [];
  if (filter.sector) conditions.push(eq(workOrders.sector, filter.sector));
  if (filter.status) conditions.push(eq(workOrders.status, filter.status));
  const where = conditions.length ? and(...conditions) : undefined;

  // Counts/breakdowns computed in SQL, never left for the model to tally over raw
  // rows — see doc/rule.md §6 and doc/decision-log.md.
  const [rows, syncedAtRows, statusBreakdown] = await Promise.all([
    db.select(WORK_ORDER_TOOL_COLUMNS).from(workOrders).where(where),
    db.select({ syncedAt: workOrders.syncedAt }).from(workOrders).limit(1),
    db
      .select({ status: workOrders.status, count: sql<number>`count(*)` })
      .from(workOrders)
      .where(where)
      .groupBy(workOrders.status),
  ]);

  const incompleteCount = rows.filter((row) => row.isIncomplete).length;
  const caveats: string[] = [];
  if (incompleteCount > 0) {
    caveats.push(
      `${incompleteCount} of ${rows.length} matching work orders have missing fields (see raw_* columns) and may be undercounted in aggregates.`
    );
  }

  const summary: WorkOrderSummary = {
    count: rows.length,
    statusBreakdown: statusBreakdown.map((row) => ({
      status: row.status,
      count: Number(row.count),
    })),
  };

  const syncedAt = syncedAtRows.length > 0 ? syncedAtRows[0].syncedAt.toISOString() : null;
  const staleness = staleCaveat(syncedAt);
  if (staleness) caveats.push(staleness);

  // Full, uncapped row set — see lib/db/queries/deals.ts for why the cap lives at
  // the tool boundary (lib/ai/tools/query-work-orders.ts) instead of here.
  return { data: rows, summary, caveats, syncedAt };
}
