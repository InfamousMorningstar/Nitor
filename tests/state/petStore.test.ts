import { describe, it, expect } from "vitest";
import { unlockedAccessories } from "@/state/petStore";

describe("unlockedAccessories", () => {
  it("only 'none' is unlocked at 0 best streak", () => {
    expect(unlockedAccessories(0)).toEqual(["none"]);
  });

  it("includes 'halo' once the 7-day milestone is reached", () => {
    const unlocked = unlockedAccessories(7);
    expect(unlocked).toContain("none");
    expect(unlocked).toContain("halo");
    expect(unlocked).not.toContain("embers");
  });

  it("includes 'embers' at 21 but not 'aurora' or 'crown' yet", () => {
    const unlocked = unlockedAccessories(21);
    expect(unlocked).toContain("embers");
    expect(unlocked).not.toContain("aurora");
    expect(unlocked).not.toContain("crown");
  });

  it("includes 'aurora' at 50", () => {
    expect(unlockedAccessories(50)).toContain("aurora");
  });

  it("includes every wardrobe item at 100 (best streak)", () => {
    const unlocked = unlockedAccessories(100);
    expect(unlocked).toEqual(expect.arrayContaining(["none", "halo", "embers", "aurora", "crown"]));
    expect(unlocked).toHaveLength(5);
  });

  it("is monotonic — a higher streak never loses a previously unlocked item", () => {
    const at7 = new Set(unlockedAccessories(7));
    const at99 = new Set(unlockedAccessories(99));
    for (const id of at7) {
      expect(at99.has(id)).toBe(true);
    }
  });
});
