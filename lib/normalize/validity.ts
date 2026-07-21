/**
 * Detects rows that are actually a duplicated header pasted into the data
 * (e.g. a cell literally containing "Deal Stage" under the "Deal Stage" column) —
 * a real artifact found in the source CSVs, not a hypothetical. These rows carry
 * no business data and must be excluded from sync, counted, and logged — never
 * silently merged in as if they were a real record (see doc/rule.md §3).
 */
export function isHeaderEchoRow(row: Record<string, string | null>): boolean {
  const entries = Object.entries(row);
  if (entries.length === 0) return false;

  const matches = entries.filter(([key, value]) => value?.trim() === key.trim());
  // A single incidental match isn't proof; a majority of columns echoing their own
  // header name means the whole row is a pasted-in header, not real data.
  return matches.length > entries.length / 2;
}
