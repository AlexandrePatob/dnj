import { describe, expect, it, vi } from "vitest";
import { mockError, resolveMockScenario } from "./mock-scenario";

describe("mock scenarios", () => {
  it("returns fixture after configured latency", async () => {
    vi.useFakeTimers();
    const result = resolveMockScenario("success", { id: "part_mock_001" }, 120);
    await vi.advanceTimersByTimeAsync(120);
    await expect(result).resolves.toEqual({ id: "part_mock_001" });
    vi.useRealTimers();
  });

  it("returns domain error for offline scenarios", async () => {
    await expect(resolveMockScenario("OFFLINE", null, 0)).rejects.toEqual(mockError("OFFLINE"));
  });
});
