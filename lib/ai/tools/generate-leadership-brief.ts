import { tool } from "ai";
import { emptyToolInputSchema } from "@/lib/validation/schemas";
import { db } from "@/lib/db/client";
import { deals, workOrders } from "@/lib/db/schema";
import { staleCaveat } from "@/lib/monday/freshness";

// All aggregation happens here in TypeScript, not by asking the model to do
// arithmetic over raw rows (see doc/rule.md §6 tool contract).
export const generateLeadershipBriefTool = tool({
  description:
    "Assembles a structured leadership-update brief (pipeline summary, operational status, data-quality footnotes) from the current synced data. Call this when the user asks to prepare a leadership/board update.",
  inputSchema: emptyToolInputSchema,
  execute: async () => {
    const [allDeals, allWorkOrders] = await Promise.all([
      db
        .select({
          sector: deals.sector,
          value: deals.value,
          isIncomplete: deals.isIncomplete,
          syncedAt: deals.syncedAt,
        })
        .from(deals),
      db
        .select({
          status: workOrders.status,
          isIncomplete: workOrders.isIncomplete,
          syncedAt: workOrders.syncedAt,
        })
        .from(workOrders),
    ]);

    const pipelineBySector = new Map<string, { count: number; value: number }>();
    for (const deal of allDeals) {
      const key = deal.sector ?? "Unclassified";
      const entry = pipelineBySector.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += deal.value ? Number(deal.value) : 0;
      pipelineBySector.set(key, entry);
    }

    const workOrdersByStatus = new Map<string, number>();
    for (const wo of allWorkOrders) {
      const key = wo.status ?? "Unclassified";
      workOrdersByStatus.set(key, (workOrdersByStatus.get(key) ?? 0) + 1);
    }

    const incompleteDeals = allDeals.filter((d) => d.isIncomplete).length;
    const incompleteWorkOrders = allWorkOrders.filter((w) => w.isIncomplete).length;

    const syncedAt =
      allDeals[0]?.syncedAt?.toISOString() ?? allWorkOrders[0]?.syncedAt?.toISOString() ?? null;

    const caveats: string[] = [];
    if (incompleteDeals > 0) {
      caveats.push(`${incompleteDeals} of ${allDeals.length} deals have missing fields.`);
    }
    if (incompleteWorkOrders > 0) {
      caveats.push(
        `${incompleteWorkOrders} of ${allWorkOrders.length} work orders have missing fields.`
      );
    }
    const staleness = staleCaveat(syncedAt);
    if (staleness) caveats.push(staleness);

    return {
      data: [
        {
          pipelineBySector: Array.from(pipelineBySector.entries()).map(([sector, v]) => ({
            sector,
            dealCount: v.count,
            totalValue: v.value,
          })),
          workOrdersByStatus: Array.from(workOrdersByStatus.entries()).map(([status, count]) => ({
            status,
            count,
          })),
          totalDeals: allDeals.length,
          totalWorkOrders: allWorkOrders.length,
        },
      ],
      caveats,
      syncedAt,
    };
  },
});
