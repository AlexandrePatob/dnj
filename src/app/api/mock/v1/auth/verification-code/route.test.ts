import { describe, expect, it } from "vitest";

import { POST } from "./route";

const request = (verificationCode: string) => new Request("http://localhost/api/mock/v1/auth/verification-code", {
  method: "POST",
  body: JSON.stringify({ email: "jovem@dnj.test", document: "12345678901", verificationCode }),
});

describe("POST /api/mock/v1/auth/verification-code", () => {
  it("creates a homologation identity for the simulated SMS code", async () => {
    const response = await POST(request("123456"));
    await expect(response.json()).resolves.toMatchObject({ email: "jovem@dnj.test", document: "12345678901", identityToken: "homologation-sms-token" });
  });

  it("rejects a wrong simulated SMS code", async () => {
    const response = await POST(request("000000"));
    expect(response.status).toBe(401);
  });
});
