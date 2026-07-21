import { tool } from "ai";
import { z } from "zod";
import { queryDeals, MAX_ROWS_RETURNED } from "@/lib/db/queries/deals";
import { queryWorkOrders } from "@/lib/db/queries/work-orders";
import { joinKey } from "@/lib/normalize/text";

const inputSchema = z.object({
  sector: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  onlyDealsWithoutWorkOrder: z
    .boolean()
    .nullish()
    .transform((v) => v ?? undefined)
    .describe("If true, return only deals that have no matching work order by deal name."),
});

export const joinDealsToWorkOrdersTool = tool({
  description:
    "Cross-reference the Deals and Work Orders boards by masked deal name (the only shared field between boards — the boards' own account/client code fields do not overlap at all). The deal name is reused across multiple real deals, so this join is approximate, not a hard foreign-key match — the match rate and ambiguity are always reported, never hidden.",
  inputSchema,
  execute: async ({ sector, onlyDealsWithoutWorkOrder }) => {
    const [dealsResult, workOrdersResult] = await Promise.all([
      queryDeals({ sector }),
      queryWorkOrders({ sector }),
    ]);

    const workOrdersByKey = new Map<string, typeof workOrdersResult.data>();
    for (const wo of workOrdersResult.data) {
      const key = joinKey(wo.dealName);
      if (!key) continue;
      const existing = workOrdersByKey.get(key) ?? [];
      existing.push(wo);
      workOrdersByKey.set(key, existing);
    }

    let matched = 0;
    let ambiguousMatches = 0;
    const joined = dealsResult.data.map((deal) => {
      const key = joinKey(deal.dealName);
      const linkedWorkOrders = key ? workOrdersByKey.get(key) ?? [] : [];
      if (linkedWorkOrders.length > 0) matched += 1;
      // More than one deal shares this deal name, so the link below is ambiguous —
      // it may belong to a different real deal that happens to share the same masked name.
      const sameNameDealCount = dealsResult.data.filter(
        (d) => joinKey(d.dealName) === key
      ).length;
      if (sameNameDealCount > 1) ambiguousMatches += 1;
      return { deal, linkedWorkOrders, isAmbiguousMatch: sameNameDealCount > 1 };
    });

    const matchRate = dealsResult.data.length > 0 ? matched / dealsResult.data.length : 0;

    // Dedupe: both sides carry the same staleness caveat when synced together.
    const caveats = [...new Set([...dealsResult.caveats, ...workOrdersResult.caveats])];
    caveats.push(
      `Deal-name join matched ${matched} of ${dealsResult.data.length} deals (${Math.round(matchRate * 100)}%) to at least one work order.`
    );
    if (ambiguousMatches > 0) {
      caveats.push(
        `${ambiguousMatches} of ${dealsResult.data.length} deals share a masked deal name with at least one other deal — their linked work orders may belong to a different deal with the same name, not necessarily this one.`
      );
    }

    const filtered = onlyDealsWithoutWorkOrder
      ? joined.filter((row) => row.linkedWorkOrders.length === 0)
      : joined;

    // Summary is computed from the full (uncapped) joined set above — always use
    // this for counts, never the (possibly truncated) "data" sample below.
    const summary = {
      totalDeals: dealsResult.data.length,
      matched,
      matchRatePercent: Math.round(matchRate * 100),
      ambiguousMatches,
      rowsReturned: Math.min(filtered.length, MAX_ROWS_RETURNED),
      rowsMatchingFilter: filtered.length,
    };

    // Same token-budget cap as query-deals.ts/query-work-orders.ts — this array can
    // be just as large (one entry per deal, each with a linkedWorkOrders sub-array).
    const data = filtered.slice(0, MAX_ROWS_RETURNED);
    if (filtered.length > MAX_ROWS_RETURNED) {
      caveats.push(
        `Showing ${MAX_ROWS_RETURNED} of ${filtered.length} matching rows in detail; counts above are computed across all ${filtered.length}.`
      );
    }

    return {
      data,
      summary,
      caveats,
      syncedAt: dealsResult.syncedAt ?? workOrdersResult.syncedAt,
    };
  },
});
