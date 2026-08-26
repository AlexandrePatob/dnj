import { beforeEach, describe, expect, it, vi } from "vitest";

const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({
  participantIdFrom: vi.fn(),
  supabaseRest: vi.fn(),
}));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({
  query: (value: Record<string, string>) => new URLSearchParams(value).toString(),
  supabaseRest,
}));

const { POST } = await import("./route");

describe("POST /api/v1/moment-challenges/[challengeId]/participations", () => {
  beforeEach(() => supabaseRest.mockReset());
  it("creates one eligible participation that opens the Moment camera", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest
      .mockResolvedValueOnce([{ id: "challenge-1", event_id: "event-1", name: "Foto com a galera", status: "active", ends_at: "2099-10-18T13:00:00Z" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "participation-1", checked_in_at: "2026-10-18T12:00:00Z", cooldown_ends_at: "2099-10-18T13:00:00Z", status: "active", can_share_moment: true, check_in_points: 0, events: { id: "event-1", name: "DNJ" }, experiences: { id: "challenge-1", name: "Foto com a galera", spaces: null } }])
      .mockResolvedValueOnce([]);

    const response = await POST(
      new Request("http://localhost/api/v1/moment-challenges/challenge-1/participations", { method: "POST", headers: { authorization: "Bearer participant" } }),
      { params: Promise.resolve({ challengeId: "challenge-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ participation: { id: "participation-1", canShareMoment: true, activity: { name: "Foto com a galera" } } });
  });

  it("refuses an expired challenge before a participation is created", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([{ id: "challenge-1", event_id: "event-1", name: "Foto", status: "active", ends_at: "2020-10-18T13:00:00Z" }]);

    const response = await POST(
      new Request("http://localhost/api/v1/moment-challenges/challenge-1/participations", { method: "POST" }),
      { params: Promise.resolve({ challengeId: "challenge-1" }) },
    );

    expect(response.status).toBe(409);
    expect(supabaseRest).toHaveBeenCalledTimes(1);
  });
});
