import { describe, it, expect } from "vitest";
import { isFresh, validateRows } from "@/data/quotes/remote";
import type { Quote } from "@/domain/quotes";

describe("quotes/remote pure helpers", () => {
  it("treats a cache newer than 14 days as fresh", () => {
    const now = Date.parse("2026-07-14");
    expect(isFresh(Date.parse("2026-07-10"), now)).toBe(true);
    expect(isFresh(Date.parse("2026-06-01"), now)).toBe(false);
  });

  it("keeps only rows with a source and required fields", () => {
    const rows: Partial<Quote>[] = [
      { text: "A", author: "x", source: "S", tradition: "stoic", themes: [] },
      { text: "B", author: "y", source: "", tradition: "stoic", themes: [] },
    ];
    expect(validateRows(rows).map((r) => r.text)).toEqual(["A"]);
  });
});
