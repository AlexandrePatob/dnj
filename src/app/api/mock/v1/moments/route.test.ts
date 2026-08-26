import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

function request(consent = true) {
  const body = new FormData();
  body.set("participationId", "part_mock_001");
  body.set("image", new Blob(["image"], { type: "image/png" }), "moment.png");
  body.set("publishConsent", String(consent));
  body.set("idempotencyKey", crypto.randomUUID());
  return new Request("http://localhost/api/mock/v1/moments", { method: "POST", headers: { authorization: "Bearer mock" }, body });
}

describe("POST /api/mock/v1/moments", () => {
  it("creates a moment with consent", async () => {
    const response = await POST(request());
    await expect(response.json()).resolves.toMatchObject({ moment: { participationId: "part_mock_001", moderationStatus: "approved", publicationStatus: "public", imageUrl: expect.stringMatching(/^data:image\/png;base64,/) } });
    expect(response.status).toBe(201);
  });

  it("creates a private moment without consent", async () => {
    const response = await POST(request(false));
    await expect(response.json()).resolves.toMatchObject({ moment: { publicationStatus: "private", moderationStatus: "approved" } });
    expect(response.status).toBe(201);
  });
});

describe("GET /api/mock/v1/moments", () => {
  it("uses one explicit scope contract for feed, personal and group moments", async () => {
    const response = await GET(new Request("http://localhost/api/mock/v1/moments?scope=feed"));
    const page = await response.json() as { scope: string; items: Array<{ publicationStatus: string }> };
    expect(page.scope).toBe("feed");
    expect(page.items).toEqual(expect.arrayContaining([expect.objectContaining({ publicationStatus: "public" })]));
  });

  it("requires participant identity for personal and group scopes", async () => {
    const response = await GET(new Request("http://localhost/api/mock/v1/moments?scope=mine"));
    expect(response.status).toBe(401);
  });
});
