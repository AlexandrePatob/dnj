import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/mock/v1/auth/sms", () => {
  it("returns the local SMS verification code without contacting a provider", async () => {
    const response = await POST(new Request("http://localhost/api/mock/v1/auth/sms", {
      method: "POST",
      body: JSON.stringify({ email: "jovem@dnj.test", document: "12345678901" }),
    }));

    await expect(response.json()).resolves.toMatchObject({ channel: "sms", verificationCode: "123456" });
  });

  it("rejects an incomplete homologation request", async () => {
    const response = await POST(new Request("http://localhost/api/mock/v1/auth/sms", { method: "POST", body: JSON.stringify({ email: "inválido" }) }));
    expect(response.status).toBe(400);
  });
});
