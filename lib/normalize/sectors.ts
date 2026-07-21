// Canonical sector list derived from the actual source data (both CSVs' Sector /
// Sector-service columns) — see doc/decision-log.md. Note there is no literal
// "Energy" sector in the real data; "Renewables" is the closest real analog to the
// assignment brief's sample "energy sector" question. The agent should not silently
// alias "energy" -> "Renewables" (that's a guess); it should ask a clarifying question
// or state the mismatch explicitly (see doc/rule.md §4.4).
const CANONICAL_SECTORS = [
  "Mining",
  "Renewables",
  "Railways",
  "Powerline",
  "Construction",
  "Manufacturing",
  "Aviation",
  "Security and Surveillance",
  "DSP",
  "Tender",
  "Others",
] as const;

export type CanonicalSector = (typeof CANONICAL_SECTORS)[number];

const ALIASES: Record<string, CanonicalSector> = {
  mining: "Mining",
  renewables: "Renewables",
  renewable: "Renewables",
  solar: "Renewables",
  wind: "Renewables",
  railways: "Railways",
  railway: "Railways",
  powerline: "Powerline",
  "power line": "Powerline",
  construction: "Construction",
  manufacturing: "Manufacturing",
  aviation: "Aviation",
  "security and surveillance": "Security and Surveillance",
  "security & surveillance": "Security and Surveillance",
  dsp: "DSP",
  tender: "Tender",
  others: "Others",
  other: "Others",
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Maps a raw, free-text sector value to a canonical sector.
 * Returns { canonical: null } (never a guessed canonical) when no known alias matches —
 * the caller surfaces this as a data-quality caveat rather than silently bucketing it.
 */
export function normalizeSector(raw: string | null | undefined): {
  canonical: CanonicalSector | null;
  matched: boolean;
} {
  if (!raw || !raw.trim()) return { canonical: null, matched: false };

  const slug = slugify(raw);

  if ((CANONICAL_SECTORS as readonly string[]).includes(raw.trim())) {
    return { canonical: raw.trim() as CanonicalSector, matched: true };
  }

  const alias = ALIASES[slug];
  if (alias) return { canonical: alias, matched: true };

  return { canonical: null, matched: false };
}

export { CANONICAL_SECTORS };
