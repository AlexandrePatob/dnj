import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const theme = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");

describe("DNJ theme tokens", () => {
  it("uses the official DNJ Game green for the game token", () => {
    expect(theme).toMatch(/--color-game-green:\s*#b2d64d;/i);
    expect(theme).toMatch(/--game:\s*var\(--color-game-green\);/);
  });

  it("keeps the semantic destructive color separate from the game token", () => {
    expect(theme).toMatch(/--destructive:\s*#db3a2e;/i);
  });
});
