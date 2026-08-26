import { describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { POST } from "./route";

describe("POST /api/v1/users/me/group", () => {
  it("rejects a request without a signed participant session", async () => {
    participantIdFrom.mockReturnValue(null);
    const response = await POST(new Request("http://localhost/api/v1/users/me/group", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(supabaseRest).not.toHaveBeenCalled();
  });

  it("persists the selected existing group for the current user", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([{ id: "event-1" }]).mockResolvedValueOnce([{ id: "group-1", name: "Jovens da Luz" }]).mockResolvedValueOnce([{ id: "user-1", email: "ana@example.com", display_name: "Ana", points: 10, role: "DEFAULT", group_id: "group-1", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" }]).mockResolvedValueOnce([{ id: "group-1", name: "Jovens da Luz" }]);
    const response = await POST(new Request("http://localhost/api/v1/users/me/group", { method: "POST", body: JSON.stringify({ groupId: "group-1" }) }));
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenCalledWith(expect.stringContaining("test_users?"), expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"group_id":"group-1"') }));
    await expect(response.json()).resolves.toMatchObject({ group: { groupName: "Jovens da Luz" }, points: 10 });
  });
});
