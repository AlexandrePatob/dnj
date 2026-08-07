import { beforeEach, describe, expect, it, vi } from "vitest";
const { participantIdFrom, supabaseRest } = vi.hoisted(() => ({ participantIdFrom: vi.fn(), supabaseRest: vi.fn() }));
vi.mock("@/lib/participant-session", () => ({ participantIdFrom }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { GET } from "./route";

describe("GET /api/v1/special-events/active", () => {
  beforeEach(() => { participantIdFrom.mockReturnValue(null); supabaseRest.mockReset(); });
  it("exposes a live special event without exposing its QR token", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "event-1", title: "Sala game", starts_at: "2026-10-18T12:00:00Z", ends_at: "2099-10-18T13:00:00Z", teaser_seconds: 15, teaser_started_at: "2020-10-18T12:00:00Z", points: 50, delivery_targets: ["app", "screen"], status: "active" }]).mockResolvedValueOnce([]);
    const response = await GET(new Request("http://localhost/api/v1/special-events/active"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ event: { id: "event-1", status: "active", targets: ["app", "screen"] } });
  });

  it("exposes an active Moment challenge with its expiry and no QR", async () => {
    supabaseRest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "challenge-1", name: "Foto com a galera", description: "Registre seu grupo", ends_at: "2099-10-18T13:00:00Z", moment_points: 30 }]);
    const response = await GET(new Request("http://localhost/api/v1/special-events/active"));
    await expect(response.json()).resolves.toMatchObject({ momentChallenge: { id: "challenge-1", title: "Foto com a galera", points: 30, endsAt: "2099-10-18T13:00:00Z" } });
  });

  it("does not re-announce a Moment challenge after the participant has submitted it", async () => {
    participantIdFrom.mockReturnValue("user-1");
    supabaseRest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "challenge-1", name: "Foto com a galera", description: null, ends_at: "2099-10-18T13:00:00Z", moment_points: 30 }]).mockResolvedValueOnce([{ moments: [{ id: "moment-1" }] }]);

    const response = await GET(new Request("http://localhost/api/v1/special-events/active", { headers: { authorization: "Bearer participant" } }));

    await expect(response.json()).resolves.toMatchObject({ momentChallenge: null });
  });
});
