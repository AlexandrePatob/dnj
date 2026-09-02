import { describe, expect, it, vi } from "vitest";
import { publishChallengeMoment, publishFreeMoment } from "./media";
import { apiMutation } from "./client";
vi.mock("./client", () => ({
  apiMutation: vi.fn(),
  newIdempotencyKey: vi
    .fn()
    .mockReturnValueOnce("intent-key")
    .mockReturnValueOnce("complete-key"),
}));
describe("Moment publishing", () => {
  it("rejects unsupported or oversized files before an intent", async () => {
    await expect(
      publishFreeMoment({
        file: new File(["x"], "x.gif", { type: "image/gif" }),
        publishConsent: true,
      }),
    ).rejects.toThrow("JPEG ou PNG");
  });
  it("orders checksum, intent, signed PUT, bodyless complete and publish with exact payloads", async () => {
    const order: string[] = [];
    vi.mocked(apiMutation).mockImplementation(async (path, options) => {
      order.push(path);
      if (path === "/media/upload-intents") {
        expect(options.body).toEqual({
          contentType: "image/jpeg",
          bytes: 3,
          checksumSha256: expect.stringMatching(/^[A-Za-z0-9+/]{43}=$/),
        });
        expect(options.idempotencyKey).toBe("intent-key");
        return {
          id: "asset-1",
          uploadUrl: "https://upload.test",
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "X-Amz-Checksum-Sha256": "signed-checksum",
          },
          expiresAt: "2030-01-01T00:00:00Z",
        };
      }
      if (path.endsWith("/complete")) {
        expect(options.body).toBeUndefined();
        expect(options.idempotencyKey).toBe("complete-key");
        return { id: "asset-1" };
      }
      expect(path).toBe("/moments/challenge");
      expect(options.body).toEqual({
        mediaAssetId: "asset-1",
        publishConsent: true,
      });
      return { id: "moment-1" };
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        order.push("PUT");
        expect(init).toMatchObject({
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "X-Amz-Checksum-Sha256": "signed-checksum",
          },
        });
        return new Response(null, { status: 200 });
      }),
    );
    await publishChallengeMoment({
      file: new File(["abc"], "photo.jpg", { type: "image/jpeg" }),
      publishConsent: true,
    });
    expect(order).toEqual([
      "/media/upload-intents",
      "PUT",
      "/media/asset-1/complete",
      "/moments/challenge",
    ]);
  });
  it("retries incomplete complete with the same key and without a new intent", async () => {
    vi.mocked(apiMutation)
      .mockReset()
      .mockImplementationOnce(async () => ({
        id: "asset-1",
        uploadUrl: "https://upload.test",
        method: "PUT",
        headers: {},
        expiresAt: "2030-01-01T00:00:00Z",
      }))
      .mockRejectedValueOnce(
        Object.assign(new Error("incomplete"), { code: "UPLOAD_INCOMPLETE" }),
      )
      .mockResolvedValueOnce({ id: "asset-1" })
      .mockResolvedValueOnce({ id: "moment-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    await publishFreeMoment({
      file: new File(["abc"], "photo.jpg", { type: "image/jpeg" }),
      publishConsent: false,
    });
    expect(
      vi
        .mocked(apiMutation)
        .mock.calls.filter(([path]) => path === "/media/upload-intents"),
    ).toHaveLength(1);
    const completeCalls = vi
      .mocked(apiMutation)
      .mock.calls.filter(([path]) => String(path).endsWith("/complete"));
    expect(completeCalls).toHaveLength(2);
    expect(completeCalls[0][1].idempotencyKey).toBe(
      completeCalls[1][1].idempotencyKey,
    );
  });
});
