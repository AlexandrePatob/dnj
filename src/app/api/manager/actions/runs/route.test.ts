import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, query, supabaseRest, token, tokenHash, qrImageUrl } = vi.hoisted(() => ({ manager: vi.fn(), query: vi.fn(() => ""), supabaseRest: vi.fn(), token: vi.fn(() => "raw-operator-token"), tokenHash: vi.fn(() => "hashed-token"), qrImageUrl: vi.fn(async () => "data:image/png;base64,qr") }));
vi.mock("@/lib/manager-api", () => ({ manager, query, supabaseRest, token, tokenHash }));
vi.mock("@/lib/manager-qr", () => ({ qrImageUrl }));
import { POST } from "./route";

describe("POST /api/manager/actions/runs", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates a dynamic QR while persisting only its hash", async () => {
    manager.mockReturnValue({ session: { sub: "manager-1" } });
    supabaseRest.mockResolvedValueOnce([{ id: "game-1" }]).mockResolvedValueOnce([{ id: "run-1" }]).mockResolvedValueOnce([{ id: "qr-1", expiration_time: "2026-10-18T15:00:00Z" }]);
    const response = await POST(new Request("http://localhost/api/manager/actions/runs", { method: "POST", body: JSON.stringify({ gameId: "game-1" }) }));
    if (!response) throw new Error("missing response");
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenLastCalledWith("qr_codes", expect.objectContaining({ body: expect.stringContaining("hashed-token") }));
    expect(String((vi.mocked(supabaseRest).mock.calls[2][1] as RequestInit).body)).not.toContain("raw-operator-token");
    await expect(response.json()).resolves.toMatchObject({ qrPayload: "raw-operator-token", qrImageUrl: "data:image/png;base64,qr" });
  });
});
