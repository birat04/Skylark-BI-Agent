const STALE_AFTER_DAYS = Number(process.env.MONDAY_DATA_STALE_AFTER_DAYS ?? 3);

/**
 * Returns a caveat string when synced data is older than the staleness threshold,
 * null otherwise — extends the freshness-disclosure rule in doc/rule.md §4.3 so the
 * agent doesn't just state a timestamp, it flags when that timestamp is old enough
 * to matter.
 */
export function staleCaveat(syncedAt: string | null): string | null {
  if (!syncedAt) return null;

  const ageMs = Date.now() - new Date(syncedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > STALE_AFTER_DAYS) {
    return `Data was last synced ${ageDays.toFixed(1)} days ago, more than the ${STALE_AFTER_DAYS}-day freshness threshold — it may not reflect the current state of monday.com. Consider running a new sync.`;
  }

  return null;
}
