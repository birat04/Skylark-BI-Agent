import { describe, it, expect } from "vitest";
import { normalizeDate } from "./dates";

describe("normalizeDate", () => {
  // Every date value across both source CSVs (1274 non-blank cells checked) was
  // already ISO yyyy-MM-dd — the real messiness in this dataset is missing values
  // and structural artifacts, not inconsistent date formats. See doc/decision-log.md.
  it("passes through the real-world case: already-ISO dates", () => {
    expect(normalizeDate("2025-09-27")).toBe("2025-09-27");
    expect(normalizeDate("2026-01-14")).toBe("2026-01-14");
  });

  // Defensive cases: normalizeDate must not assume every future data source is this clean.
  it("normalizes other common formats to ISO", () => {
    expect(normalizeDate("09/27/2025")).toBe("2025-09-27");
    expect(normalizeDate("9/27/2025")).toBe("2025-09-27");
    expect(normalizeDate("September 27, 2025")).toBe("2025-09-27");
    expect(normalizeDate("Sep 27, 2025")).toBe("2025-09-27");
  });

  it("returns null (never a guess) for blank or missing values", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate("   ")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
  });

  it("returns null for the header-echo artifact value rather than guessing a date", () => {
    expect(normalizeDate("Close Date (A)")).toBeNull();
  });
});
