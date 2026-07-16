import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/redirect";

describe("safeNext", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeNext("/today")).toBe("/today");
    expect(safeNext("/habits")).toBe("/habits");
  });

  it("preserves a query string", () => {
    expect(safeNext("/habits?tab=archive")).toBe("/habits?tab=archive");
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeNext("//evil.com")).toBe("/today");
  });

  it("rejects absolute URLs", () => {
    expect(safeNext("https://evil.com")).toBe("/today");
    expect(safeNext("http://evil.com")).toBe("/today");
  });

  it("rejects backslash tricks browsers may normalise to //", () => {
    expect(safeNext("/\\evil.com")).toBe("/today");
    expect(safeNext("\\\\evil.com")).toBe("/today");
  });

  it("rejects scheme-like values", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/today");
  });

  it("falls back on empty and missing values", () => {
    expect(safeNext(null)).toBe("/today");
    expect(safeNext(undefined)).toBe("/today");
    expect(safeNext("")).toBe("/today");
  });

  it("honours an explicit fallback", () => {
    expect(safeNext(null, "/settings")).toBe("/settings");
  });
});
