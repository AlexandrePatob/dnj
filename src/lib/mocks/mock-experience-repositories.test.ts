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
    const page = await createMockExperienceRepositories({ latencyMs: 0 }).gallery.list({ scope: "feed", eventId: "event_dnj_curitiba_2026" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ moderationStatus: "approved", publicationStatus: "public" });
  });

  it("saves a private moment without publication consent", async () => {
    const repository = createMockExperienceRepositories({ latencyMs: 0 }).moment;
    await expect(repository.create({ participationId: "part_mock_001", image: new Blob(), publishConsent: false, idempotencyKey: "key-2" })).resolves.toMatchObject({ publicationStatus: "private", moderationStatus: "approved" });
  });

  it("shares likes and comments through the same in-memory gallery", async () => {
    const gallery = createMockExperienceRepositories({ latencyMs: 0 }).gallery;
    const before = await gallery.list({ scope: "feed", eventId: "event_dnj_curitiba_2026" });
    const moment = before.items[0];
    const initialLikes = moment.likesCount;

    await gallery.toggleLike(moment.id);
    await gallery.addComment(moment.id, "Estamos juntos!");

    const after = await gallery.list({ scope: "feed", eventId: "event_dnj_curitiba_2026" });
    expect(after.items[0]).toMatchObject({ id: moment.id, likesCount: initialLikes + 1, likedByCurrentUser: true });
    expect(after.items[0].comments).toEqual(expect.arrayContaining([expect.objectContaining({ authorName: "Você", body: "Estamos juntos!" })]));
  });
});
