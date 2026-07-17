import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSession } from "@/state/SessionProvider";

describe("useSession", () => {
  it("throws when used outside a SessionProvider", () => {
    // Silence the expected React error-boundary console output for this render.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useSession())).toThrow(
        "useSession must be used within SessionProvider",
      );
    } finally {
      spy.mockRestore();
    }
  });
});
