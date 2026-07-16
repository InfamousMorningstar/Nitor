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

  it("rejects embedded whitespace browsers would strip before parsing", () => {
    // Browsers remove raw TAB/LF/CR anywhere in a URL, so a validated
    // "/\t/evil.com" would reach the client as "//evil.com" — a
    // protocol-relative escape. The regex's \s ban is the only guard.
    expect(safeNext("/\t/evil.com")).toBe("/today");
    expect(safeNext("/\n")).toBe("/today");
    expect(safeNext("/ /x")).toBe("/today");
  });

  it("admits percent-encoded and dot-segment paths by design", () => {
    // Safe only because callers pass the value to the redirect verbatim:
    // encoded slashes never become an authority unless something decodes
    // the string after validation (see the safeNext caller contract).
    expect(safeNext("/%2F%2Fevil.com")).toBe("/%2F%2Fevil.com");
    // Safe because the redirect's authority is fixed before the browser
    // normalises dot-segments (RFC 3986 §5.2) — ".." can only move within
    // our own origin's path space.
    expect(safeNext("/..//evil.com")).toBe("/..//evil.com");
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
