import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseRest, createAdminCookie } = vi.hoisted(() => ({ supabaseRest: vi.fn(), createAdminCookie: vi.fn(() => "signed-admin") }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("@/lib/admin-session", () => ({ adminCookie: { name: "dnj_admin_session", maxAge: 1 }, createAdminCookie, verifyAdminCookie: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ supabaseRest }));
import { POST } from "./route";

describe("POST /api/admin/session", () => {
  beforeEach(() => vi.clearAllMocks());
  it("creates an admin session only after persisted credential verification", async () => {
    supabaseRest.mockResolvedValue({ email: "admin@dnj.local", display_name: "Administração DNJ" });
    const response = await POST(new Request("http://localhost/api/admin/session", { method: "POST", body: JSON.stringify({ email: "admin@dnj.local", password: "dnj2026" }) }));
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenCalledWith("rpc/dnj_admin_login", expect.objectContaining({ body: expect.stringContaining("admin@dnj.local") }));
    expect(createAdminCookie).toHaveBeenCalledWith("admin@dnj.local");
  });
});
