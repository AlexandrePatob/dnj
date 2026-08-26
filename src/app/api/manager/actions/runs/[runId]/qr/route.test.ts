import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, ownActivityRun, supabaseRest, token, tokenHash } = vi.hoisted(
  () => ({
    manager: vi.fn(),
    ownActivityRun: vi.fn(),
    supabaseRest: vi.fn(),
    token: vi.fn(),
    tokenHash: vi.fn(),
  }),
);
vi.mock("@/lib/manager-api", () => ({
  manager,
  ownActivityRun,
  supabaseRest,
  token,
  tokenHash,
  query: (value: Record<string, string>) =>
    new URLSearchParams(value).toString(),
}));
vi.mock("@/lib/manager-qr", () => ({ qrImageUrl: vi.fn() }));
const { POST } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("POST /api/manager/actions/runs/:runId/qr", () => {
  it("does not reissue a check-in QR after the run starts", async () => {
    manager.mockReturnValue({
      session: { sub: "manager-1", scope: "radicality" },
    });
    ownActivityRun.mockResolvedValue({
      id: "run-1",
      experience_id: "game-1",
      status: "active",
    });
    const response = await POST(
      new Request("http://localhost/api/manager/actions/runs/run-1/qr", {
        method: "POST",
      }),
      { params: Promise.resolve({ runId: "run-1" }) },
    );
    expect(response?.status).toBe(404);
    expect(supabaseRest).not.toHaveBeenCalled();
  });
});
