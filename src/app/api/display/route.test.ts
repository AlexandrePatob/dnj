import { describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  query: (value: Record<string, string>) =>
    new URLSearchParams(value).toString(),
  supabaseRest,
}));
import { GET } from "./route";

describe("GET /api/display", () => {
  it("returns persisted participant and group rankings plus the targeted special-event teaser", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([{ id: "group-1", name: "Jovens da Luz" }])
      .mockResolvedValueOnce([
        {
          id: "participant-1",
          display_name: "Ana",
          points: 30,
          group_id: "group-1",
        },
        {
          id: "participant-2",
          display_name: "Bia",
          points: 20,
          group_id: "group-1",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "special-app",
          title: "Só no app",
          status: "teaser",
          ends_at: "2099-10-18T13:00:00Z",
          teaser_seconds: 15,
          teaser_started_at: "2099-10-18T12:00:00Z",
          points: 50,
          delivery_targets: ["app"],
        },
        {
          id: "special-tv",
          title: "Sala Game",
          status: "teaser",
          ends_at: "2099-10-18T13:00:00Z",
          teaser_seconds: 15,
          teaser_started_at: "2099-10-18T12:00:00Z",
          points: 50,
          delivery_targets: ["tv"],
        },
      ]);

    const response = await GET(
      new Request("http://localhost/api/display?target=tv"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      rankings: {
        individual: [
          {
            id: "participant-1",
            name: "Ana",
            points: 30,
            group: "Jovens da Luz",
          },
          {
            id: "participant-2",
            name: "Bia",
            points: 20,
            group: "Jovens da Luz",
          },
        ],
        groups: [
          { id: "group-1", name: "Jovens da Luz", members: 2, points: 50 },
        ],
      },
      specialEvent: {
        id: "special-tv",
        title: "Sala Game",
        status: "teaser",
        points: 50,
      },
    });
    expect(body.specialEvent).not.toHaveProperty("qrPayload");
  });

  it("does not expose an event that was not targeted to the requested display", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "special-tv",
          title: "Sala Game",
          status: "active",
          ends_at: "2099-10-18T13:00:00Z",
          teaser_seconds: 15,
          teaser_started_at: "2020-10-18T12:00:00Z",
          points: 50,
          delivery_targets: ["tv"],
        },
      ]);

    const response = await GET(
      new Request("http://localhost/api/display?target=screen"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.specialEvent).toBeNull();
  });

  it("returns a QR image only for an active special event targeted to the display", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "special-tv",
          title: "Chuva de Graça",
          status: "active",
          ends_at: "2099-10-18T13:00:00Z",
          teaser_seconds: 15,
          teaser_started_at: "2020-10-18T12:00:00Z",
          points: 80,
          delivery_targets: ["tv"],
          display_qr_payload: "DNJ-SPECIAL-QR",
        },
      ]);

    const response = await GET(new Request("http://localhost/api/display?target=tv"));

    await expect(response.json()).resolves.toMatchObject({
      specialEvent: {
        id: "special-tv",
        status: "active",
        qrImageUrl: expect.stringMatching(/^data:image\//),
      },
    });
  });

  it("returns to the rankings when the targeted event has already ended", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "special-tv",
          title: "Sala Game",
          status: "active",
          ends_at: "2020-10-18T13:00:00Z",
          teaser_seconds: 15,
          teaser_started_at: "2020-10-18T12:00:00Z",
          points: 50,
          delivery_targets: ["tv"],
        },
      ]);

    const response = await GET(
      new Request("http://localhost/api/display?target=tv"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.specialEvent).toBeNull();
  });
});
