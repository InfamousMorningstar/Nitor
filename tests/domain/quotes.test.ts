import { describe, it, expect } from "vitest";
import { quoteOfDay, QUOTES } from "@/domain/quotes";

describe("quoteOfDay", () => {
  it("is deterministic for a given date", () => {
    const a = quoteOfDay("2026-07-13");
    const b = quoteOfDay("2026-07-13");
    expect(a).toEqual(b);
  });

  it("returns a real quote from the seed list", () => {
    const q = quoteOfDay("2026-01-01");
    expect(QUOTES).toContainEqual(q);
  });

  it("varies across different dates", () => {
    const seen = new Set(
      ["2026-01-01", "2026-02-14", "2026-03-30", "2026-07-13", "2026-11-05"].map(
        (d) => quoteOfDay(d).author + quoteOfDay(d).source
      )
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
