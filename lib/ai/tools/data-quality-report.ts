import { tool } from "ai";
import { db } from "@/lib/db/client";
import { deals, workOrders } from "@/lib/db/schema";
import { staleCaveat } from "@/lib/monday/freshness";
import { emptyToolInputSchema } from "@/lib/validation/schemas";

export const dataQualityReportTool = tool({
  description:
    "Reports overall data-quality stats across both boards: total rows, incomplete-row counts, and last sync time. Use this when a user asks how reliable/complete the data is.",
  inputSchema: emptyToolInputSchema,
  execute: async () => {
    const [allDeals, allWorkOrders] = await Promise.all([
      db.select({ isIncomplete: deals.isIncomplete, syncedAt: deals.syncedAt }).from(deals),
      db
        .select({ isIncomplete: workOrders.isIncomplete, syncedAt: workOrders.syncedAt })
        .from(workOrders),
    ]);

    const incompleteDeals = allDeals.filter((d) => d.isIncomplete).length;
    const incompleteWorkOrders = allWorkOrders.filter((w) => w.isIncomplete).length;

    const syncedAt =
      allDeals[0]?.syncedAt?.toISOString() ?? allWorkOrders[0]?.syncedAt?.toISOString() ?? null;
    const staleness = staleCaveat(syncedAt);

    return {
      data: [
        {
          board: "Deals",
          totalRows: allDeals.length,
          incompleteRows: incompleteDeals,
        },
        {
          board: "Work Orders",
          totalRows: allWorkOrders.length,
          incompleteRows: incompleteWorkOrders,
        },
      ],
      caveats: staleness ? [staleness] : [],
      syncedAt,
    };
  },
});
