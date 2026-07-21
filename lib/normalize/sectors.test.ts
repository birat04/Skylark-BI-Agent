import { describe, it, expect } from "vitest";
import { normalizeSector } from "./sectors";

describe("normalizeSector", () => {
  // These are the exact values observed in both source CSVs' Sector / Sector-service
  // columns — every real value already matched the canonical list exactly (no casing
  // or spelling variants were present in this dataset). See doc/decision-log.md.
  it("matches every real sector value seen in the source data", () => {
    for (const real of [
      "Mining",
      "Renewables",
      "Railways",
      "Powerline",
      "Others",
      "Construction",
      "DSP",
      "Tender",
      "Manufacturing",
      "Security and Surveillance",
      "Aviation",
    ]) {
      expect(normalizeSector(real)).toEqual({ canonical: real, matched: true });
    }
  });

  // Defensive: aliasing must not assume every future data source is this clean.
  it("matches known aliases regardless of case/spacing", () => {
    expect(normalizeSector("mining")).toEqual({ canonical: "Mining", matched: true });
    expect(normalizeSector("  RENEWABLES  ")).toEqual({ canonical: "Renewables", matched: true });
    expect(normalizeSector("solar")).toEqual({ canonical: "Renewables", matched: true });
  });

  it("does not fabricate a canonical sector for an unknown value", () => {
    expect(normalizeSector("Agriculture")).toEqual({ canonical: null, matched: false });
  });

  // Explicitly: there is no "Energy" sector in the real data. Renewables is the closest
  // real analog, but normalizeSector must not silently alias one to the other — that
  // would be a fabricated assumption the agent isn't entitled to make (doc/rule.md §4.4).
  it("does not alias 'energy' to Renewables", () => {
    expect(normalizeSector("Energy")).toEqual({ canonical: null, matched: false });
    expect(normalizeSector("energy")).toEqual({ canonical: null, matched: false });
  });

  it("returns unmatched (not a guess) for blank/missing values", () => {
    expect(normalizeSector("")).toEqual({ canonical: null, matched: false });
    expect(normalizeSector(null)).toEqual({ canonical: null, matched: false });
    expect(normalizeSector(undefined)).toEqual({ canonical: null, matched: false });
  });
});
