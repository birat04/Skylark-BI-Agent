import { parse, isValid, format } from "date-fns";

// Formats observed in monday.com free-text/date columns during Phase 0 import.
// Extend this list as real source data reveals new formats — do not guess ahead of the data.
const KNOWN_FORMATS = [
  "yyyy-MM-dd",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "dd-MM-yyyy",
  "MMMM d, yyyy",
  "MMM d, yyyy",
];

/**
 * Normalizes an inconsistent date string to ISO (yyyy-MM-dd).
 * Returns null (not a guess) when the value is missing or unparseable —
 * callers must treat null as a data-quality caveat, never as "today".
 */
export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;

  const trimmed = raw.trim();

  for (const fmt of KNOWN_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  const nativeParsed = new Date(trimmed);
  if (isValid(nativeParsed) && !Number.isNaN(nativeParsed.getTime())) {
    return format(nativeParsed, "yyyy-MM-dd");
  }

  return null;
}
