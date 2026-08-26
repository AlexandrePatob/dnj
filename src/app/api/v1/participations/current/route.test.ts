import { describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { GET } from "./route";

describe("GET /api/v1/participations/current", () => {
  it("requires a participant session", async () => {
    participantIdFrom.mockReturnValue(null);
    expect((await GET(new Request("http://localhost/api/v1/participations/current"))).status).toBe(401);
  });

  it("returns 204 when the participant has no active participation", async () => {
    participantIdFrom.mockReturnValue("user-1"); supabaseRest.mockResolvedValueOnce([]);
    expect((await GET(new Request("http://localhost/api/v1/participations/current", { headers: { authorization: "Bearer session" } }))).status).toBe(204);
  });

  it("excludes an expired Moment window from the current participation", async () => {
    participantIdFrom.mockReturnValue("user-1"); supabaseRest.mockResolvedValueOnce([]);

    expect((await GET(new Request("http://localhost/api/v1/participations/current", { headers: { authorization: "Bearer session" } }))).status).toBe(204);
    expect(supabaseRest).toHaveBeenCalledWith(expect.stringContaining("cooldown_ends_at=gt."));
  });

  it("does not return a participation whose Moment was already created", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([{ id: "participation-1", moments: [{ id: "moment-1" }] }]);

    expect((await GET(new Request("http://localhost/api/v1/participations/current", { headers: { authorization: "Bearer session" } }))).status).toBe(204);
  });
});
