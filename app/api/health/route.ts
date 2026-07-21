import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { syncRuns } from "@/lib/db/schema";

export async function GET() {
  try {
    const [lastRun] = await db
      .select()
      .from(syncRuns)
      .orderBy(desc(syncRuns.startedAt))
      .limit(1);

    return NextResponse.json({
      status: "ok",
      lastSync: lastRun ?? null,
    });
  } catch {
    return NextResponse.json({
      status: "degraded",
      lastSync: null,
    });
  }
}
