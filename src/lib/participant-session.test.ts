import { beforeAll, describe, expect, it } from "vitest";
import { createParticipantToken, readParticipantToken } from "./participant-session";

describe("participant session", () => {
  beforeAll(() => { process.env.HOMOLOGATION_SESSION_SECRET = "test-only-session-secret"; });
  it("accepts the server-signed participant id until expiration", () => {
    const token = createParticipantToken("participant-1", 1_000);
    expect(readParticipantToken(`Bearer ${token}`, 1_001)).toEqual({ sub: "participant-1", exp: 43_201_000 });
  });

  it("rejects a modified or expired token", () => {
    const token = createParticipantToken("participant-1", 1_000);
    expect(readParticipantToken(`Bearer ${token}x`, 1_001)).toBeNull();
    expect(readParticipantToken(`Bearer ${token}`, 43_201_000)).toBeNull();
  });
});
