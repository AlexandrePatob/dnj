import { describe, expect, it } from "vitest";

describe("Vitest runner", () => {
  it("runs TypeScript tests in the default Node environment", () => {
    expect(typeof process.versions.node).toBe("string");
  });
});
