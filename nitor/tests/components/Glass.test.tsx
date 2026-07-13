import { describe, it, expect } from "vitest";
import { detectGlassTier } from "@/components/glass/useGlassTier";

describe("detectGlassTier", () => {
  it("returns 3 when reduced motion is requested", () => {
    expect(detectGlassTier({ reducedMotion: true, chromiumSvgBackdrop: true })).toBe(3);
  });
  it("returns 1 for Chromium with SVG backdrop support", () => {
    expect(detectGlassTier({ reducedMotion: false, chromiumSvgBackdrop: true })).toBe(1);
  });
  it("returns 2 otherwise (Safari/Firefox fallback)", () => {
    expect(detectGlassTier({ reducedMotion: false, chromiumSvgBackdrop: false })).toBe(2);
  });
});
