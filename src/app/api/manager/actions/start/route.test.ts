import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, ownActivityRun, supabaseRest } = vi.hoisted(() => ({
  manager: vi.fn(),
  ownActivityRun: vi.fn(),
  supabaseRest: vi.fn(),
}));
vi.mock("@/lib/manager-api", () => ({ manager, ownActivityRun, supabaseRest }));
const { POST } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("POST /api/manager/actions/start", () => {
  it("starts the run and closes its check-in QR", async () => {
    manager.mockReturnValue({
      session: { sub: "manager-1", scope: "radicality" },
    });
    ownActivityRun.mockResolvedValue({
      id: "run-1",
      experience_id: "game-1",
      status: "draft",
    });
    supabaseRest.mockResolvedValue(undefined);
    const response = await POST(
      new Request("http://localhost/api/manager/actions/start", {
        method: "POST",
        body: JSON.stringify({ runId: "run-1" }),
      }),
    );
    if (!response) throw new Error("Resposta ausente");
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenNthCalledWith(
      2,
      "qr_codes?activity_run_id=eq.run-1&status=eq.active",
      expect.objectContaining({
        method: "PATCH",
        body: '{"status":"disabled"}',
      }),
    );
  });

  it("refuses a run owned by another manager", async () => {
    manager.mockReturnValue({
      session: { sub: "manager-1", scope: "radicality" },
    });
    ownActivityRun.mockResolvedValue(null);
    const response = await POST(
      new Request("http://localhost/api/manager/actions/start", {
        method: "POST",
        body: JSON.stringify({ runId: "run-2" }),
      }),
    );
    expect(response?.status).toBe(404);
    expect(supabaseRest).not.toHaveBeenCalled();
  });
});
