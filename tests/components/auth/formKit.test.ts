import { describe, it, expect } from "vitest";
import { passwordError, emailError } from "@/components/auth/formKit";

describe("passwordError", () => {
  it("requires a password", () => {
    expect(passwordError("")).toBe("Password is required.");
  });

  it("rejects a 10-character password client-side (S10 parity)", () => {
    expect(passwordError("abcdefghij")).toBe("Use at least 12 characters.");
  });

  it("rejects 11 characters", () => {
    expect(passwordError("abcdefghijk")).toBe("Use at least 12 characters.");
  });

  it("accepts exactly 12 characters", () => {
    expect(passwordError("abcdefghijkl")).toBeUndefined();
  });

  it("still honours an explicit minimum", () => {
    expect(passwordError("abcdefgh", 8)).toBeUndefined();
  });
});

describe("emailError", () => {
  it("requires an email", () => {
    expect(emailError("")).toBe("Email is required.");
  });

  it("rejects a malformed email", () => {
    expect(emailError("nope")).toBe("Enter a valid email address.");
  });

  it("accepts a valid email", () => {
    expect(emailError("a@b.co")).toBeUndefined();
  });
});
