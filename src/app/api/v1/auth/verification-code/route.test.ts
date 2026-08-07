import { beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseRest } = vi.hoisted(() => ({ supabaseRest: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ query: (value: Record<string, string>) => new URLSearchParams(value).toString(), supabaseRest }));

import { POST } from "./route";

function request(verificationCode: string) {
  return new Request("http://localhost/api/v1/auth/verification-code", { method: "POST", body: JSON.stringify({ email: "ana.souza@example.com", document: "123.456.789-01", verificationCode }) });
}

describe("POST /api/v1/auth/verification-code", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_SIMULATION = "true";
    process.env.HOMOLOGATION_SESSION_SECRET = "test-only-session-secret";
    vi.clearAllMocks();
  });

  it("persists the participant and returns a signed session only for the homologation code", async () => {
    supabaseRest.mockResolvedValueOnce([{ id: "user-1", email: "ana.souza@example.com", display_name: "Ana Souza", points: 0, role: "DEFAULT", group_id: null, created_at: "2026-10-01T00:00:00.000Z", updated_at: "2026-10-01T00:00:00.000Z" }]);
    const response = await POST(request("123456"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(supabaseRest).toHaveBeenCalledWith(expect.stringContaining("test_users?"), expect.objectContaining({ method: "POST", body: expect.stringContaining('"external_key":"12345678901"') }));
    expect(body).toMatchObject({ id: "user-1", name: "Ana Souza", document: "12345678901", points: 0 });
    expect(body.identityToken).toEqual(expect.stringMatching(/^v1\./));
  });

  it("refuses an incorrect code without writing a user", async () => {
    const response = await POST(request("000000"));
    expect(response.status).toBe(401);
    expect(supabaseRest).not.toHaveBeenCalled();
  });
});
