import { describe, expect, it } from "vitest";
import { createManagerCookie, readManagerCookie } from "./operator-session";

describe("operator session", () => {
  it("round-trips a scoped manager session and rejects a tampered cookie", () => {
    process.env.HOMOLOGATION_SESSION_SECRET = "test-secret";
    const cookie = createManagerCookie({ sub: "manager-1", email: "gestor@dnj.local", name: "Gestor", scope: "radicality" });
    expect(readManagerCookie(cookie)).toMatchObject({ sub: "manager-1", scope: "radicality" });
    expect(readManagerCookie(`${cookie}x`)).toBeNull();
  });
});
