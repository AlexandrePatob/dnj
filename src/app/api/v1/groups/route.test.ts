import { describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { GET } from "./route";

describe("GET /api/v1/groups", () => {
  it("returns only the persisted groups for the DNJ 2K26 event", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "event-1" }]).mockResolvedValueOnce([{ id: "group-1", name: "Jovens da Luz" }]);
    const response = await GET(new Request("http://localhost/api/v1/groups?search=luz"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: "group-1", groupName: "Jovens da Luz" }]);
    expect(supabaseRest).toHaveBeenLastCalledWith(expect.stringContaining("event_id=eq.event-1"));
  });
});
