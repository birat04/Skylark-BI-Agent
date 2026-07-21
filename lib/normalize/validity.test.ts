import { describe, it, expect } from "vitest";
import { isHeaderEchoRow } from "./validity";

describe("isHeaderEchoRow", () => {
  // This is a real row found in the Deals CSV during Phase 0 — a pasted-in header
  // row that landed as data (see doc/decision-log.md). Confirmed via a dry run of
  // the import script's CSV parsing before writing this test.
  it("flags the real header-echo row found in the Deals CSV", () => {
    const echoRow = {
      "Deal Name": "Nezuko",
      "Owner code": "",
      "Client Code": "",
      "Deal Status": "Deal Status",
      "Close Date (A)": "Close Date (A)",
      "Closure Probability": "Closure Probability",
      "Masked Deal value": "",
      "Tentative Close Date": "Tentative Close Date",
      "Deal Stage": "Deal Stage",
      "Product deal": "Product deal",
      "Sector/service": "Sector/service",
      "Created Date": "Created Date",
    };
    expect(isHeaderEchoRow(echoRow)).toBe(true);
  });

  it("does not flag a real data row", () => {
    const realRow = {
      "Deal Name": "Naruto",
      "Owner code": "OWNER_001",
      "Client Code": "COMPANY089",
      "Deal Status": "Open",
      "Close Date (A)": "",
      "Closure Probability": "High",
      "Masked Deal value": "489360",
      "Tentative Close Date": "2026-02-26",
      "Deal Stage": "B. Sales Qualified Leads",
      "Product deal": "Service + Spectra",
      "Sector/service": "Mining",
      "Created Date": "2025-12-26",
    };
    expect(isHeaderEchoRow(realRow)).toBe(false);
  });

  it("does not flag a row with a single incidental header-matching value", () => {
    // e.g. a deal literally named the same as one of its own column headers —
    // one coincidental match shouldn't be enough to discard a real row.
    const row = {
      "Deal Name": "Deal Status",
      "Owner code": "OWNER_002",
      "Deal Status": "Open",
    };
    expect(isHeaderEchoRow(row)).toBe(false);
  });

  it("returns false for an empty row", () => {
    expect(isHeaderEchoRow({})).toBe(false);
  });
});
