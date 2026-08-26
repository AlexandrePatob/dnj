import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, ownActivityRun, supabaseRest } = vi.hoisted(() => ({
  manager: vi.fn(),
  ownActivityRun: vi.fn(),
  supabaseRest: vi.fn(),
}));
vi.mock("@/lib/manager-api", () => ({ manager, ownActivityRun, supabaseRest }));
import { POST } from "./route";

describe("POST /api/manager/actions/results", () => {
  beforeEach(() => vi.clearAllMocks());
  it("finalizes rankings through the idempotent scoring RPC", async () => {
    manager.mockReturnValue({ session: { sub: "manager-1" } });
    ownActivityRun.mockResolvedValue({
      id: "run-1",
      status: "results",
      experience_id: "game-1",
    });
    supabaseRest.mockResolvedValue({
      ok: true,
      alreadyFinalized: false,
      awarded: 220,
    });
    const response = await POST(
      new Request("http://localhost/api/manager/actions/results", {
        method: "POST",
        body: JSON.stringify({
          runId: "run-1",
          results: [
            { participantId: "user-1", result: "first" },
            { participantId: "user-2", result: "participation" },
          ],
        }),
      }),
    );
    if (!response) throw new Error("missing response");
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenCalledWith(
      "rpc/dnj_finalize_activity_run_v2",
      expect.objectContaining({
        body: expect.stringContaining('"placement":1'),
      }),
    );
  });

  it("accepts the RPC's already-finalized result without issuing a second award", async () => {
    manager.mockReturnValue({ session: { sub: "manager-1" } });
    ownActivityRun.mockResolvedValue({
      id: "run-1",
      status: "results",
      experience_id: "game-1",
    });
    supabaseRest.mockResolvedValue({
      ok: true,
      alreadyFinalized: true,
      awarded: 0,
    });
    const response = await POST(
      new Request("http://localhost/api/manager/actions/results", {
        method: "POST",
        body: JSON.stringify({
          runId: "run-1",
          results: [{ participantId: "user-1", result: "first" }],
        }),
      }),
    );
    if (!response) throw new Error("missing response");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      alreadyFinalized: true,
      awarded: 0,
    });
    expect(supabaseRest).toHaveBeenCalledTimes(1);
    expect(supabaseRest).toHaveBeenCalledWith(
      "rpc/dnj_finalize_activity_run_v2",
      expect.any(Object),
    );
  });
});
