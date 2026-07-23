import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mockMoments, mockParticipation } from "@/lib/mocks/experience-fixtures";

const contract = readFileSync("docs/api/dnj-experience.openapi.yaml", "utf8");

describe("DNJ Experience OpenAPI examples", () => {
  it("describes fields returned by mock participation and moments", () => {
    for (const field of ["id", "checkedInAt", "cooldownEndsAt", "status", "canShareMoment", "checkInPoints"]) {
      expect(mockParticipation).toHaveProperty(field);
      expect(contract).toContain(field);
    }
    for (const field of ["id", "participationId", "imageUrl", "thumbnailUrl", "shareImageUrl", "capturedAt", "moderationStatus", "publicationStatus", "pointsAwarded"]) {
      expect(mockMoments[0]).toHaveProperty(field);
      expect(contract).toContain(field);
    }
  });
});
