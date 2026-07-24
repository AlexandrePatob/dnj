import { describe, expect, it } from "vitest";
import { createMockExperienceRepositories } from "./mock-experience-repositories";

describe("mock experience repositories", () => {
  it("keeps QR validation idempotent by key", async () => {
    const repository = createMockExperienceRepositories({ latencyMs: 0 }).participation;
    const first = await repository.validateQr({ qrToken: "valid", idempotencyKey: "key-1" });
    const second = await repository.validateQr({ qrToken: "valid", idempotencyKey: "key-1" });
    expect(second.id).toBe(first.id);
  });

  it("exposes only public approved moments in gallery", async () => {
    const page = await createMockExperienceRepositories({ latencyMs: 0 }).gallery.list({ eventId: "event_dnj_curitiba_2026" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ moderationStatus: "approved", publicationStatus: "public" });
  });

  it("saves a private moment without publication consent", async () => {
    const repository = createMockExperienceRepositories({ latencyMs: 0 }).moment;
    await expect(repository.create({ participationId: "part_mock_001", image: new Blob(), publishConsent: false, idempotencyKey: "key-2" })).resolves.toMatchObject({ publicationStatus: "private", moderationStatus: "approved" });
  });
});
