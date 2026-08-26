import { describe, expect, it, vi } from "vitest";

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

const { PATCH, POST } = await import("./route");

describe("Admin experiences API", () => {
  it("creates only a valid unscheduled experience in the event database", async () => {
    supabaseRest
      .mockResolvedValueOnce([{ id: "event-1" }])
      .mockResolvedValueOnce([
        { id: "experience-1", name: "Roda de conversa" },
      ]);
    const response = await POST(
      new Request("http://localhost/api/admin/experiences", {
        method: "POST",
        body: JSON.stringify({
          name: "Roda de conversa",
          kind: "stand",
          points: 20,
          momentPoints: 0,
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenLastCalledWith(
      "experiences",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"kind":"stand"'),
      }),
    );
  });

  it("rejects a negative score before writing", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/experiences", {
        method: "POST",
        body: JSON.stringify({ name: "Inválida", kind: "stand", points: -1 }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("starts a draft Moment challenge without changing other experience kinds", async () => {
    supabaseRest
      .mockResolvedValueOnce([
        { id: "challenge-1", kind: "moment_challenge", status: "draft", moment_duration_minutes: 5, ends_at: null },
      ])
      .mockResolvedValueOnce(undefined);
    const response = await PATCH(
      new Request("http://localhost/api/admin/experiences", {
        method: "PATCH",
        body: JSON.stringify({ id: "challenge-1", status: "active" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenLastCalledWith(
      expect.stringContaining("experiences?"),
      expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"status":"active"') }),
    );
  });
});
