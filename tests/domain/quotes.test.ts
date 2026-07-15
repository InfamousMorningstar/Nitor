import { describe, it, expect, beforeEach } from "vitest";
import { quoteOfDay, QUOTES, setRemoteQuotes, allQuotes } from "@/domain/quotes";

describe("quoteOfDay", () => {
  beforeEach(() => {
    setRemoteQuotes([]);
  });

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

describe("setRemoteQuotes & allQuotes", () => {
  beforeEach(() => {
    setRemoteQuotes([]);
  });

  it("merges validated remote quotes and dedupes by text", () => {
    setRemoteQuotes([
      { text: "  It is not that we have a short time to live, but that we waste a lot of it. ", author: "Seneca", source: "On the Shortness of Life, 1", tradition: "stoic", themes: [] }, // dup of bundled
      { text: "New verified line.", author: "X", source: "Real Source (1999)", tradition: "wisdom", themes: [] },
    ]);
    const all = allQuotes();
    const dupCount = all.filter((q) => q.text.includes("waste a lot of it")).length;
    expect(dupCount).toBe(1);
    expect(all.some((q) => q.text === "New verified line.")).toBe(true);
  });

  it("rejects remote quotes without a source", () => {
    setRemoteQuotes([{ text: "No source", author: "Y", source: "  ", tradition: "wisdom", themes: [] }]);
    expect(allQuotes().some((q) => q.text === "No source")).toBe(false);
  });
});
