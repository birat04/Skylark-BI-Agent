import { tool } from "ai";
import { workOrderFilterSchema } from "@/lib/validation/schemas";
import { queryWorkOrders } from "@/lib/db/queries/work-orders";
import { MAX_ROWS_RETURNED } from "@/lib/db/queries/deals";

export const queryWorkOrdersTool = tool({
  description:
    "Query the Work Orders board (project execution), optionally filtered by sector or status. Returns a row sample, a server-computed summary (count/statusBreakdown — always use this for totals, never count the rows yourself), data-quality caveats, and the last sync timestamp.",
  inputSchema: workOrderFilterSchema,
  execute: async (filter) => {
    const result = await queryWorkOrders(filter);

    // See lib/ai/tools/query-deals.ts for why this cap lives at the tool boundary.
    if (result.data.length > MAX_ROWS_RETURNED) {
      const total = result.data.length;
      return {
        ...result,
        data: result.data.slice(0, MAX_ROWS_RETURNED),
        caveats: [
          ...result.caveats,
          `Showing ${MAX_ROWS_RETURNED} of ${total} matching work orders in detail; counts and breakdowns above are computed across all ${total}.`,
        ],
      };
    }

    return result;
  },
});
