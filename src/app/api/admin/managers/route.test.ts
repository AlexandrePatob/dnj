import { describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("@/lib/admin-session", () => ({ adminCookie: { name: "dnj_admin_session" }, verifyAdminCookie: vi.fn(() => true) }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));

const { POST } = await import("./route");

describe("Admin manager accounts API", () => {
  it("creates a credentialed space timekeeper only with a space scope", async () => {
    supabaseRest.mockResolvedValueOnce([{ user_id: "manager-1" }]);
    const response = await POST(new Request("http://localhost/api/admin/managers", { method: "POST", body: JSON.stringify({ name: "Palco", email: "palco@dnj.local", password: "senha-segura", scope: "space_timer", spaceId: "space-1" }) }));
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenCalledWith("rpc/dnj_admin_upsert_manager", expect.objectContaining({ body: expect.stringContaining('"p_scope":"space_timer"') }));
  });

  it("does not accept a timekeeper without a space", async () => {
    const response = await POST(new Request("http://localhost/api/admin/managers", { method: "POST", body: JSON.stringify({ name: "Palco", email: "palco@dnj.local", password: "senha-segura", scope: "space_timer" }) }));
    expect(response.status).toBe(400);
  });
});
