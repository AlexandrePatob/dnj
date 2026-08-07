import { beforeEach, describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest, supabaseStorage } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn(), supabaseStorage: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest, supabaseStorage }));
import { POST } from "./route";

describe("POST /api/v1/moments", () => {
  beforeEach(() => {
    supabaseRest.mockReset();
    supabaseStorage.mockReset();
  });
  it("publishes a consented Moment as approved and awards its points immediately", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "participation-1", can_share_moment: true, experiences: { moment_points: 30 } }]).mockResolvedValueOnce([{ id: "media-1" }]).mockResolvedValueOnce([{ id: "moment-1", participation_id: "participation-1", publication_status: "public", moderation_status: "approved", points_awarded: 30, captured_at: "2026-10-18T12:00:00Z", media_objects: null, participations: null }]).mockResolvedValueOnce([]);
    supabaseStorage.mockResolvedValue(new Response());
    const form = new FormData();
    form.set("participationId", "participation-1"); form.set("image", new File(["image"], "moment.jpg", { type: "image/jpeg" })); form.set("publishConsent", "true"); form.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");
    const response = await POST(new Request("http://localhost/api/v1/moments", { method: "POST", headers: { authorization: "Bearer participant" }, body: form }));
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenCalledWith("moments", expect.objectContaining({ body: expect.stringContaining('"moderation_status":"approved"') }));
    await expect(response.json()).resolves.toMatchObject({ moment: { moderationStatus: "approved", pointsAwarded: 30 } });
  });

  it("rejects a Moment challenge photo after its deadline", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "participation-1", can_share_moment: true, experiences: { kind: "moment_challenge", status: "active", ends_at: "2020-10-18T13:00:00Z", moment_points: 30 } }]);
    const form = new FormData();
    form.set("participationId", "participation-1"); form.set("image", new File(["image"], "moment.jpg", { type: "image/jpeg" })); form.set("publishConsent", "true"); form.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");

    const response = await POST(new Request("http://localhost/api/v1/moments", { method: "POST", headers: { authorization: "Bearer participant" }, body: form }));

    expect(response.status).toBe(409);
    expect(supabaseStorage).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ code: "MOMENT_NOT_ELIGIBLE" });
  });

  it("rejects a second photo for the same Moment challenge before uploading it", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "participation-1", can_share_moment: true, experiences: { kind: "moment_challenge", status: "active", ends_at: "2099-10-18T13:00:00Z", moment_points: 30 } }])
      .mockResolvedValueOnce([{ id: "moment-1" }]);
    const form = new FormData();
    form.set("participationId", "participation-1"); form.set("image", new File(["image"], "moment.jpg", { type: "image/jpeg" })); form.set("publishConsent", "true"); form.set("idempotencyKey", "11111111-1111-4111-8111-111111111111");

    const response = await POST(new Request("http://localhost/api/v1/moments", { method: "POST", headers: { authorization: "Bearer participant" }, body: form }));

    expect(response.status).toBe(409);
    expect(supabaseStorage).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ code: "MOMENT_ALREADY_CREATED" });
  });
});
