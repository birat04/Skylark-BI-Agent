/**
 * Trims, collapses whitespace, and normalizes casing for free-text fields
 * (account names, item names) so fuzzy joins across boards are reliable.
 */
export function normalizeText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Lowercased, punctuation-stripped key used for matching account names between
 * the Deals and Work Orders boards, which share no hard foreign key.
 */
export function joinKey(raw: string | null | undefined): string | null {
  const normalized = normalizeText(raw);
  if (!normalized) return null;
  return normalized
    .toLowerCase()
    .replace(/[.,'"()&]/g, "")
    .replace(/\b(inc|llc|ltd|corp|co)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
