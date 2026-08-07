import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn() })),
}));
vi.mock("@/lib/admin-session", () => ({
  adminCookie: { name: "dnj_admin_session" },
  verifyAdminCookie: vi.fn(() => true),
}));
vi.mock("@/lib/supabase-server", () => ({
  query: (value: Record<string, string>) =>
    new URLSearchParams(value).toString(),
  supabaseRest,
}));

const { POST, PATCH } = await import("./route");

describe("Admin special events API", () => {
  beforeEach(() => supabaseRest.mockReset());
  it("creates the special event with a QR payload already persisted", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([{ id: "experience-1" }])
      .mockResolvedValueOnce([{ id: "special-1" }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const response = await POST(
      new Request("http://localhost/api/admin/special-events", {
        method: "POST",
        body: JSON.stringify({
          title: "Sala game",
          durationMinutes: 10,
          points: 20,
          teaserSeconds: 15,
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenNthCalledWith(
      2,
      "experiences",
      expect.objectContaining({
        body: expect.stringContaining('"allows_moment":false'),
      }),
    );
    expect(supabaseRest).toHaveBeenNthCalledWith(
      4,
      "qr_codes",
      expect.objectContaining({
        body: expect.stringContaining('"status":"disabled"'),
      }),
    );
    expect(supabaseRest).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("special_events?"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringMatching(/"display_qr_payload":".+"/),
      }),
    );
  });

  it("only accepts the special event state machine", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/special-events", {
        method: "PATCH",
        body: JSON.stringify({ id: "special-1", status: "invalid" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("activates the pre-generated QR when the teaser begins", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "special-1", experience_id: "experience-1", status: "draft", teaser_started_at: null, teaser_seconds: 15, ends_at: "2099-10-18T13:00:00Z", display_qr_payload: "pre-generated" }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const response = await PATCH(
      new Request("http://localhost/api/admin/special-events", {
        method: "PATCH",
        body: JSON.stringify({ id: "special-1", status: "teaser" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenLastCalledWith(
      expect.stringContaining("qr_codes?"),
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"status":"active"'),
      }),
    );
  });

  it("reuses the pre-generated QR when the special event becomes active", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "special-1", experience_id: "experience-1", status: "teaser", teaser_started_at: "2020-10-18T12:00:00Z", teaser_seconds: 15, ends_at: "2099-10-18T13:00:00Z", display_qr_payload: "pre-generated" }])
      .mockResolvedValueOnce(undefined);

    const response = await PATCH(
      new Request("http://localhost/api/admin/special-events", {
        method: "PATCH",
        body: JSON.stringify({ id: "special-1", status: "active" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "active", qrImageUrl: expect.stringMatching(/^data:image\//) });
    expect(supabaseRest).toHaveBeenCalledTimes(2);
  });

  it("reissues a missing display QR for an event that is already active", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "special-1", experience_id: "experience-1", status: "active", teaser_started_at: "2020-10-18T12:00:00Z", teaser_seconds: 15, ends_at: "2099-10-18T13:00:00Z" }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ id: "qr-2" }])
      .mockResolvedValueOnce(undefined);

    const response = await PATCH(new Request("http://localhost/api/admin/special-events", { method: "PATCH", body: JSON.stringify({ id: "special-1", status: "active" }) }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "active", qrId: "qr-2", qrImageUrl: expect.stringMatching(/^data:image\//) });
  });
});
