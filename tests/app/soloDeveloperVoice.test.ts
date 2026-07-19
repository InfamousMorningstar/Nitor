import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function tsxFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && path.endsWith(".tsx") ? [path] : [];
  });
}

describe("solo-developer product voice", () => {
  it("uses singular or neutral language throughout user-facing source", () => {
    const offenders = [...tsxFiles("src/app"), ...tsxFiles("src/components")]
      .map((path) => ({
        path,
        content: readFileSync(path, "utf8").replaceAll("en-US", ""),
      }))
      .filter(({ content }) => /\b(?:we|our|ours|us)\b/i.test(content))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });
});
