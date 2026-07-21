import { NextResponse } from "next/server";
import { runSync, checkSyncRateLimit } from "@/lib/monday/sync";

// Manual sync trigger (also runnable on a schedule via Vercel Cron per
// doc/architecture.md §7). Not publicly writable beyond triggering a read-only pull.
// Rate-limited to MONDAY_SYNC_RATE_LIMIT (default 100) triggers per rolling 24h,
// tracked via sync_runs so it holds across serverless instances (see doc/rule.md §6).
export async function POST() {
  const rateLimit = await checkSyncRateLimit();
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Sync rate limit reached: ${rateLimit.recentSyncCount}/${rateLimit.limit} syncs in the last 24h. Try again later.`,
      },
      { status: 429 }
    );
  }

  try {
    const summary = await runSync();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
