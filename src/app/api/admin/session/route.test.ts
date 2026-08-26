import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseRest, createAdminCookie } = vi.hoisted(() => ({ supabaseRest: vi.fn(), createAdminCookie: vi.fn(() => "signed-admin") }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("@/lib/admin-session", () => ({ adminCookie: { name: "dnj_admin_session", maxAge: 1 }, createAdminCookie, verifyAdminCookie: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ supabaseRest }));
import { POST } from "./route";

describe("POST /api/admin/session", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
  it("creates an admin session only after persisted credential verification", async () => {
    supabaseRest.mockResolvedValue({ email: "admin@dnj.local", display_name: "Administração DNJ" });
    const response = await POST(new Request("http://localhost/api/admin/session", { method: "POST", body: JSON.stringify({ email: "admin@dnj.local", password: "dnj2026" }) }));
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenCalledWith("rpc/dnj_admin_login", expect.objectContaining({ body: expect.stringContaining("admin@dnj.local") }));
    expect(createAdminCookie).toHaveBeenCalledWith("admin@dnj.local");
  });

  it("creates an admin session only for an ADMIN identity token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: { email: "admin@dnj.local", role: "ADMIN" } }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await POST(new Request("http://localhost/api/admin/session", { method: "POST", body: JSON.stringify({ accessToken: "identity-token" }) }));
    expect(response.status).toBe(200);
    expect(createAdminCookie).toHaveBeenCalledWith("admin@dnj.local");
  });

  it("rejects a non-admin identity token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user: { email: "user@dnj.local", role: "DEFAULT" } }), { status: 200, headers: { "content-type": "application/json" } })));
    const response = await POST(new Request("http://localhost/api/admin/session", { method: "POST", body: JSON.stringify({ accessToken: "identity-token" }) }));
    expect(response.status).toBe(403);
  });
});
