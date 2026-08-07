import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync("docs/api/dnj-experience.openapi.yaml", "utf8");

describe("DNJ homologation OpenAPI contract", () => {
  it("documents the participant payloads returned by the persisted API", () => {
    for (const field of ["id", "checkedInAt", "cooldownEndsAt", "status", "canShareMoment", "checkInPoints"]) {
      expect(contract).toContain(field);
    }

    for (const field of ["id", "participationId", "imageUrl", "thumbnailUrl", "shareImageUrl", "capturedAt", "moderationStatus", "publicationStatus", "pointsAwarded"]) {
      expect(contract).toContain(field);
    }
  });

  it("keeps every Route Handler family visible in the homologation contract", () => {
    for (const endpoint of [
      "/qr/validate",
      "/participations/current",
      "/moments",
      "/gallery/{momentId}/likes",
      "/game/overview",
      "/spaces",
      "/api/admin/overview",
      "/api/admin/moderation",
      "/api/admin/notifications",
      "/api/push/subscribe",
      "/api/test-users/presence",
    ]) {
      expect(contract).toContain(endpoint);
    }
  });
});
