import { beforeEach, describe, expect, it, vi } from "vitest";

const { manager, ownActivityRun, supabaseRest } = vi.hoisted(() => ({
  manager: vi.fn(),
  ownActivityRun: vi.fn(),
  supabaseRest: vi.fn(),
}));
vi.mock("@/lib/manager-api", () => ({ manager, ownActivityRun, supabaseRest }));
import { POST } from "./route";

describe("POST /api/manager/actions/close", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats a repeated close request as successful without writing again", async () => {
    manager.mockReturnValue({ session: { sub: "manager-1" } });
    ownActivityRun.mockResolvedValue({ id: "run-1", status: "cancelled" });

    const response = await POST(
      new Request("http://localhost/api/manager/actions/close", {
        method: "POST",
        body: JSON.stringify({ runId: "run-1" }),
      }),
    );

    if (!response) throw new Error("Resposta ausente");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      alreadyClosed: true,
    });
    expect(supabaseRest).not.toHaveBeenCalled();
  });
});
