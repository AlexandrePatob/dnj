import { describe, expect, it } from "vitest";
import { findActiveMomentChallenge, isActiveMomentChallenge } from "./moment-challenges";

const base = { id: "c1", name: "Foto da galera", description: "Compartilhe", startsAt: "2026-08-28T10:00:00Z", endsAt: "2026-08-28T12:00:00Z", momentPoints: 30, allowsMoment: true, status: "active" };

describe("moment challenge validity", () => {
  const now = Date.parse("2026-08-28T11:00:00Z");
  it("accepts only active challenges inside their time window", () => expect(isActiveMomentChallenge(base, now)).toBe(true));
  it("rejects future, expired, paused and non-photo challenges", () => {
    expect(isActiveMomentChallenge({ ...base, startsAt: "2026-08-28T12:00:00Z" }, now)).toBe(false);
    expect(isActiveMomentChallenge({ ...base, endsAt: "2026-08-28T10:59:00Z" }, now)).toBe(false);
    expect(isActiveMomentChallenge({ ...base, status: "paused" }, now)).toBe(false);
    expect(isActiveMomentChallenge({ ...base, allowsMoment: false }, now)).toBe(false);
  });
  it("does not fall back to old challenges", () => expect(findActiveMomentChallenge([{ ...base, endsAt: "2026-08-28T10:59:00Z" }], now)).toBeNull());
});
