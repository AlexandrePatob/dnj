import { describe, expect, it } from "vitest";
import { POST } from "./route";

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
    await expect(response.json()).resolves.toMatchObject({ moment: { participationId: "part_mock_001", moderationStatus: "pending" } });
    expect(response.status).toBe(201);
  });

  it("rejects creation without consent", async () => {
    const response = await POST(request(false));
    await expect(response.json()).resolves.toMatchObject({ code: "CONSENT_REQUIRED" });
    expect(response.status).toBe(422);
  });
});
