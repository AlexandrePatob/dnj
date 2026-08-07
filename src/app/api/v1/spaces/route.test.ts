import { describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { GET } from "./route";

describe("GET /api/v1/spaces", () => {
  it("returns map spaces persisted for the DNJ 2K26 event", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "event-1" }]).mockResolvedValueOnce([{ id: "space-1", name: "Espaço Esperança", slug: "espaco-esperanca", map_reference: "map:esperanca" }]);
    const response = await GET();
    await expect(response.json()).resolves.toEqual([{ id: "space-1", name: "Espaço Esperança", slug: "espaco-esperanca", mapReference: "map:esperanca" }]);
  });
});
