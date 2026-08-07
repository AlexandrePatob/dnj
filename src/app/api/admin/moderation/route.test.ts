import { describe, expect, it, vi } from "vitest";

const { supabaseRest, supabaseStorage } = vi.hoisted(() => ({ supabaseRest: vi.fn(), supabaseStorage: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: vi.fn() })) }));
vi.mock("@/lib/admin-session", () => ({ adminCookie: { name: "dnj_admin_session" }, verifyAdminCookie: vi.fn(() => true) }));
vi.mock("@/lib/supabase-server", () => ({
  query: (params: Record<string, string>) => new URLSearchParams(params).toString(),
  supabaseRest,
  supabaseStorage,
}));

const { GET, PATCH } = await import("./route");

describe("Admin moment moderation API", () => {
  it("lists approved awarded Moments with an image URL for corrective review", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "moment-1", captured_at: "2026-10-18T17:35:00.000Z", points_awarded: 30, moderation_status: "approved", reward_status: "awarded", photo_status: "available", media_objects: { storage_key: "private/moment-1.jpg" }, participations: { test_users: { display_name: "Alex" } } }]);

    const response = await GET(new Request("http://localhost/api/admin/moderation?queue=general"));

    await expect(response.json()).resolves.toMatchObject({ moments: [{ id: "moment-1", points_awarded: 30, moderation_status: "approved", imageUrl: "/api/v1/media/private/moment-1.jpg" }] });
    expect(supabaseRest).toHaveBeenCalledWith(expect.stringContaining("moderation_status=eq.approved"));
    expect(supabaseRest).toHaveBeenCalledWith(expect.not.stringContaining("gallery_posts"));
  });

  it("rejects commands outside the corrective moderation decisions", async () => {
    const response = await PATCH(new Request("http://localhost/api/admin/moderation", { method: "PATCH", body: JSON.stringify({ id: "moment-1", action: "rejected" }) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Decisão de moderação inválida." });
  });

  it("rejects a removed reason field instead of silently ignoring it", async () => {
    const response = await PATCH(new Request("http://localhost/api/admin/moderation", { method: "PATCH", body: JSON.stringify({ id: "moment-1", action: "deny_points", reason: "não usar" }) }));

    expect(response.status).toBe(400);
  });

  it("deletes the storage object only for an inappropriate photo decision", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "moment-1", media_objects: { storage_key: "private/moment-1.jpg" } }]);
    supabaseRest.mockResolvedValueOnce([{ moment_id: "moment-1", storage_key: "private/moment-1.jpg", photo_deleted: true }]);
    supabaseStorage.mockResolvedValueOnce(undefined);

    const response = await PATCH(new Request("http://localhost/api/admin/moderation", { method: "PATCH", body: JSON.stringify({ id: "moment-1", action: "delete_photo" }) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, momentId: "moment-1", action: "delete_photo", photoDeleted: true });
    expect(supabaseStorage).toHaveBeenCalledWith("object/dnj-moments/private%2Fmoment-1.jpg", { method: "DELETE" });
    expect(supabaseRest).toHaveBeenLastCalledWith("rpc/moderate_moment", expect.objectContaining({ method: "POST", body: expect.stringContaining("delete_photo") }));
  });
});
