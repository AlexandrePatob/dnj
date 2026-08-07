import { describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { GET } from "./route";

describe("GET /api/v1/game/overview", () => {
  it("derives rankings and point history from persisted users, groups and entries", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([{ id: "event-1" }]).mockResolvedValueOnce([{ id: "group-1", name: "Jovens da Luz" }]).mockResolvedValueOnce([{ id: "user-1", display_name: "Ana", points: 20, group_id: "group-1" }, { id: "user-2", display_name: "Bia", points: 10, group_id: "group-1" }]).mockResolvedValueOnce([{ id: "point-1", reason: "qr_checkin", delta: 20, created_at: "2026-10-18T09:00:00Z" }]);
    const response = await GET(new Request("http://localhost/api/v1/game/overview", { headers: { authorization: "Bearer session" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ individual: expect.arrayContaining([expect.objectContaining({ id: "user-1", isUser: true, group: "Jovens da Luz" })]), groups: [{ id: "group-1", members: 2, points: 30 }], pointEntries: [{ label: "Check-in de atividade", points: 20 }], current: { rankPosition: 1, groupId: "group-1" } });
  });
});
