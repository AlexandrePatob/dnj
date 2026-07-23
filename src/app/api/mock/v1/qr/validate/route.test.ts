import { describe, expect, it } from "vitest";
import { POST } from "./route";

function request(qrToken: string) {
  return new Request("http://localhost/api/mock/v1/qr/validate", {
    method: "POST",
    headers: { authorization: "Bearer mock", "content-type": "application/json" },
    body: JSON.stringify({ qrToken, idempotencyKey: crypto.randomUUID() }),
  });
}

describe("POST /api/mock/v1/qr/validate", () => {
  it("creates an active participation for a valid QR", async () => {
    const response = await POST(request("valid"));
    await expect(response.json()).resolves.toMatchObject({ participation: { status: "active" } });
    expect(response.status).toBe(201);
  });

  it("maps expired QR errors", async () => {
    const response = await POST(request("expired"));
    await expect(response.json()).resolves.toMatchObject({ code: "QR_EXPIRED" });
    expect(response.status).toBe(410);
  });
});
