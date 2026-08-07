import { describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { POST } from "./route";

describe("POST /api/v1/gallery/:momentId/likes", () => {
  it("creates a persisted like for the authenticated participant when none exists", async () => {
    participantIdFrom.mockReturnValue("user-1"); supabaseRest.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined);
    const response = await POST(new Request("http://localhost/api/v1/gallery/moment-1/likes", { method: "POST" }), { params: Promise.resolve({ momentId: "moment-1" }) });
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenLastCalledWith("moment_likes", expect.objectContaining({ method: "POST", body: expect.stringContaining('"user_id":"user-1"') }));
    await expect(response.json()).resolves.toEqual({ likedByCurrentUser: true });
  });
});
