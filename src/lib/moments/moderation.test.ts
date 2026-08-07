import { describe, expect, it } from "vitest";
import { isModerationAction, moderationOutcome } from "./moderation";

describe("moment moderation policy", () => {
  it("denies points without deleting the photo", () => {
    expect(moderationOutcome("deny_points")).toEqual({ publicationStatus: "private", moderationStatus: "rejected", rewardStatus: "denied", photoStatus: "available", shouldDeleteStorageObject: false });
  });

  it("deletes inappropriate photos and denies points", () => {
    expect(moderationOutcome("delete_photo")).toEqual({ publicationStatus: "private", moderationStatus: "rejected", rewardStatus: "denied", photoStatus: "deleted", shouldDeleteStorageObject: true });
  });

  it("accepts only corrective moderation commands", () => {
    expect(isModerationAction("approved")).toBe(false);
    expect(isModerationAction("deny_points")).toBe(true);
    expect(isModerationAction("delete_photo")).toBe(true);
    expect(isModerationAction("rejected")).toBe(false);
  });
});
