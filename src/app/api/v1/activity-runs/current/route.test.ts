import { describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({
  participantIdFrom: vi.fn(),
  supabaseRest: vi.fn(),
}));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({
  query: (value: Record<string, string>) =>
    new URLSearchParams(value).toString(),
  supabaseRest,
}));
const { GET } = await import("./route");

describe("GET /api/v1/activity-runs/current", () => {
  it("returns the pending dynamic run for its scanned participant", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([
      {
        activity_run_id: "run-1",
        activity_runs: {
          id: "run-1",
          status: "draft",
          experiences: { name: "Corrida do saco" },
        },
      },
    ]);
    const response = await GET(
      new Request("http://localhost/api/v1/activity-runs/current", {
        headers: { authorization: "Bearer participant" },
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      run: { id: "run-1", status: "draft", gameName: "Corrida do saco" },
    });
  });

  it("allows a participant to observe their completed run long enough to close the flow", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([
      {
        activity_run_id: "run-1",
        activity_runs: {
          id: "run-1",
          status: "completed",
          experiences: { name: "Corrida do saco" },
        },
      },
    ]);
    const response = await GET(
      new Request("http://localhost/api/v1/activity-runs/current?runId=run-1"),
    );
    await expect(response.json()).resolves.toMatchObject({
      run: { status: "completed" },
    });
  });
});
