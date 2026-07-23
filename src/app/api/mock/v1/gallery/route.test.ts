import { describe, expect, it } from "vitest";
import { GET as list } from "./route";
import { GET as mine } from "./mine/route";

describe("mock gallery routes", () => {
  it("returns only approved public gallery moments", async () => {
    const response = await list(new Request("http://localhost/api/mock/v1/gallery?eventId=event_dnj_curitiba_2026"));
    await expect(response.json()).resolves.toMatchObject({ items: [{ moderationStatus: "approved", publicationStatus: "public" }] });
  });

  it("requires auth for personal gallery", async () => {
    const response = await mine(new Request("http://localhost/api/mock/v1/gallery/mine"));
    expect(response.status).toBe(401);
  });
});
