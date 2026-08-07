import { describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));

import { GET } from "./route";

describe("GET /api/v1/schedule", () => {
  it("returns concurrent live events and an event starting in exactly 15 minutes for the Home", async () => {
    supabaseRest.mockResolvedValueOnce([
      { id: "opening", name: "Abertura", description: null, starts_at: "2026-10-18T12:00:00.000Z", ends_at: "2026-10-18T12:15:00.000Z", spaces: { id: "stage", name: "Palco Principal", slug: "palco-principal" } },
      { id: "prayer", name: "Orações", description: null, starts_at: "2026-10-18T12:00:00.000Z", ends_at: "2026-10-18T13:00:00.000Z", spaces: { id: "holy", name: "Espaço Santidade", slug: "espaco-santidade" } },
      { id: "next", name: "Animação da Manhã", description: "Arautos", starts_at: "2026-10-18T12:15:00.000Z", ends_at: "2026-10-18T13:00:00.000Z", spaces: { id: "stage", name: "Palco Principal", slug: "palco-principal" } },
    ]);

    const response = await GET(new Request("http://localhost/api/v1/schedule?view=home&at=2026-10-18T12:00:00.000Z"));
    const body = await response.json();

    expect(body.items).toHaveLength(3);
    expect(body.items.map((item: { state: string }) => item.state)).toEqual(["live", "live", "upcoming"]);
    expect(body.items[2]).toMatchObject({ title: "Animação da Manhã", sector: { slug: "palco-principal" } });
  });

  it("rejects an invalid reference time", async () => {
    const response = await GET(new Request("http://localhost/api/v1/schedule?at=not-a-time"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_TIME" });
  });
});
