import { tool } from "ai";
import { dealFilterSchema } from "@/lib/validation/schemas";
import { queryDeals, MAX_ROWS_RETURNED } from "@/lib/db/queries/deals";

export const queryDealsTool = tool({
  description:
    "Query the Deals board (sales pipeline), optionally filtered by sector, stage, or close date range. Returns a row sample, a server-computed summary (count/totalValue — always use this for totals, never sum the rows yourself), data-quality caveats, and the last sync timestamp.",
  inputSchema: dealFilterSchema,
  execute: async (filter) => {
    const result = await queryDeals(filter);

    // Cap rows returned to the model here, at the tool boundary — callers that need
    // the full set for their own computation (join-deals-work-orders.ts) call
    // queryDeals directly and are unaffected. An unbounded row list blew past
    // Groq's free-tier 12k-tokens/minute limit on a real, unfiltered query
    // (344 rows ≈ 23k tokens). See doc/decision-log.md.
    if (result.data.length > MAX_ROWS_RETURNED) {
      const total = result.data.length;
      return {
        ...result,
        data: result.data.slice(0, MAX_ROWS_RETURNED),
        caveats: [
          ...result.caveats,
          `Showing ${MAX_ROWS_RETURNED} of ${total} matching deals in detail; totals and counts above are computed across all ${total}.`,
        ],
      };
    }

    return result;
  },
});
