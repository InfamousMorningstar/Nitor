import { describe, it, expect } from "vitest";
import { searchEmojis, EMOJI_DATA } from "@/domain/emojiData";

describe("searchEmojis", () => {
  it("returns a sensible default set for an empty query", () => {
    const result = searchEmojis("");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("📖");
  });

  it("returns the same default set for a blank/whitespace query", () => {
    expect(searchEmojis("   ")).toEqual(searchEmojis(""));
  });

  it("finds the reading emoji for 'read'", () => {
    expect(searchEmojis("read")).toContain("📖");
  });

  it("is case-insensitive", () => {
    expect(searchEmojis("READ")).toEqual(searchEmojis("read"));
  });

  it("ranks startsWith matches above substring-only matches", () => {
    // "run" starts a keyword on 🏃 ("run"), and only appears mid-word in
    // no other habit keyword — this asserts the exact-start match surfaces.
    const result = searchEmojis("run");
    expect(result[0]).toBe("🏃");
  });

  it("live-filters as a habit name is typed, e.g. 'medit' -> meditate", () => {
    const result = searchEmojis("medit");
    expect(result).toContain("🧘");
  });

  it("returns no duplicate emojis for a broad query", () => {
    const result = searchEmojis("a");
    expect(new Set(result).size).toBe(result.length);
  });

  it("returns an empty array for a nonsense query", () => {
    expect(searchEmojis("zzzzzznotarealkeyword")).toEqual([]);
  });

  it("keeps the dataset reasonably sized and self-contained", () => {
    expect(EMOJI_DATA.length).toBeGreaterThanOrEqual(100);
  });
});
