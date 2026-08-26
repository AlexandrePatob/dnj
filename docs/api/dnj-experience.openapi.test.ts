import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync("docs/api/dnj-experience.openapi.yaml", "utf8");

describe("DNJ Experience OpenAPI examples", () => {
  it("describes fields returned by persisted participation and moments", () => {
    for (const field of ["id", "checkedInAt", "cooldownEndsAt", "status", "canShareMoment", "checkInPoints"]) {
      expect(contract).toContain(field);
    }
    for (const field of ["id", "participationId", "imageUrl", "thumbnailUrl", "shareImageUrl", "capturedAt", "moderationStatus", "publicationStatus", "pointsAwarded"]) {
      expect(contract).toContain(field);
    }
  });
});
