import { describe, it, expect } from "vitest";
import { normalizeText, joinKey } from "./text";

describe("normalizeText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeText("  Sakura  ")).toBe("Sakura");
    expect(normalizeText("Scooby-Doo\t")).toBe("Scooby-Doo");
  });

  it("returns null for blank/missing values", () => {
    expect(normalizeText("")).toBeNull();
    expect(normalizeText("   ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
  });
});

describe("joinKey", () => {
  // These are real masked deal names shared between the Deals and Work Orders CSVs —
  // confirmed 52/58 overlap during Phase 0 (doc/decision-log.md). The join key must be
  // case/whitespace-insensitive since it's the only link between the two boards.
  it("produces matching keys for the real shared deal names", () => {
    expect(joinKey("Sakura")).toBe(joinKey("Sakura"));
    expect(joinKey("  sakura ")).toBe(joinKey("Sakura"));
    expect(joinKey("Scooby-Doo")).toBe(joinKey("scooby-doo"));
  });

  it("returns null for blank/missing values", () => {
    expect(joinKey("")).toBeNull();
    expect(joinKey(null)).toBeNull();
  });

  it("strips common suffixes and punctuation for fuzzy matching", () => {
    expect(joinKey("Acme Inc.")).toBe(joinKey("Acme"));
    expect(joinKey("Acme, LLC")).toBe(joinKey("Acme"));
  });
});
