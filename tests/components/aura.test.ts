import { describe, it, expect } from "vitest";
import { auraFor } from "@/components/glass/aura";

describe("auraFor", () => {
  it("returns warm/radiant gradient for high momentum", () => {
    const result = auraFor(90);
    expect(result.from).toBe("var(--nitor)");
    expect(result.to).toBe("var(--nitor-2)");
    expect(result.opacity).toBe(0.37);
  });

  it("returns building gradient for mid momentum", () => {
    const result = auraFor(50);
    expect(result.from).toBe("var(--nitor)");
    expect(result.to).toBe("var(--calm)");
  });

  it("returns resting/cool gradient for low momentum", () => {
    const result = auraFor(10);
    expect(result.from).toBe("var(--calm)");
    expect(result.to).toBe("var(--calm-2)");
    expect(result.opacity).toBe(0.15);
  });

  it("clamps momentum above 100", () => {
    const result = auraFor(120);
    expect(result.opacity).toBe(0.4);
    expect(result.from).toBe("var(--nitor)");
    expect(result.to).toBe("var(--nitor-2)");
  });

  it("clamps momentum below 0", () => {
    const result = auraFor(-20);
    expect(result.opacity).toBe(0.12);
    expect(result.from).toBe("var(--calm)");
    expect(result.to).toBe("var(--calm-2)");
  });
});
