import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));
import { createParticipantToken } from "@/lib/participant-session";
import { POST } from "./route";

describe("POST /api/v1/qr/validate", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.HOMOLOGATION_SESSION_SECRET = "unit-test-session-secret"; });
  it("rejects unauthenticated QR validation", async () => {
    const response = await POST(new Request("http://localhost/api/v1/qr/validate", { method: "POST", body: JSON.stringify({ qrToken: "DNJ", idempotencyKey: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(401);
  });

  it("creates a persisted participation and awards its configured points", async () => {
    supabaseRest.mockResolvedValueOnce({ ok: true, created: true, newTotalPoints: 15, participation: { id: "participation-1", event: { id: "event-1", name: "DNJ" }, activity: { id: "experience-1", name: "Abertura" }, place: { id: "space-1", name: "Palco Principal" }, checkedInAt: "2026-10-18T12:00:00Z", cooldownEndsAt: "2026-10-18T12:00:00Z", status: "active", canShareMoment: true, checkInPoints: 10 } });
    const response = await POST(new Request("http://localhost/api/v1/qr/validate", { method: "POST", headers: { authorization: `Bearer ${createParticipantToken("user-1")}` }, body: JSON.stringify({ qrToken: "DNJ-ABERTURA-2026", idempotencyKey: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(201);
    expect(supabaseRest).toHaveBeenCalledWith("rpc/validate_dnj_qr", expect.objectContaining({ method: "POST", body: expect.stringContaining('"p_user_id":"user-1"') }));
    await expect(response.json()).resolves.toMatchObject({ participation: { id: "participation-1", checkInPoints: 10, newTotalPoints: 15 } });
  });

  it("returns the persisted result of a dynamic activity scan idempotently", async () => {
    supabaseRest.mockResolvedValueOnce({ ok: true, created: false, newTotalPoints: 135, participation: { id: "participation-run-1", event: { id: "event-1", name: "DNJ" }, activity: { id: "game-1", name: "Corrida do saco" }, place: { id: "space-1", name: "Espaço Radicalidade" }, checkedInAt: "2026-10-18T12:00:00Z", cooldownEndsAt: "2026-10-18T12:00:00Z", status: "active", canShareMoment: false, checkInPoints: 30 } });
    const response = await POST(new Request("http://localhost/api/v1/qr/validate", { method: "POST", headers: { authorization: `Bearer ${createParticipantToken("user-1")}` }, body: JSON.stringify({ qrToken: "DYNAMIC-RUN", idempotencyKey: "11111111-1111-4111-8111-111111111112" }) }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ participation: { id: "participation-run-1", activity: { name: "Corrida do saco" }, canShareMoment: false, newTotalPoints: 135 } });
  });
});
