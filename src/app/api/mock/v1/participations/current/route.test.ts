import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/mock/v1/participations/current", () => {
  it("requires authentication", async () => {
    const response = await GET(new Request("http://localhost/api/mock/v1/participations/current"));
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(response.status).toBe(401);
  });

  it("returns the active participation", async () => {
    const response = await GET(new Request("http://localhost/api/mock/v1/participations/current", { headers: { authorization: "Bearer mock" } }));
    await expect(response.json()).resolves.toMatchObject({ participation: { id: "part_mock_001", status: "active" } });
    expect(response.status).toBe(200);
  });
});
