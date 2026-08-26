import { describe, expect, it, vi } from "vitest";
import { publishMoment } from "./media";
import { apiMutation } from "./client";
vi.mock("./client", () => ({ apiMutation: vi.fn(), newIdempotencyKey: vi.fn().mockReturnValueOnce("intent-key").mockReturnValueOnce("complete-key") }));
describe("publishMoment", () => {
  it("rejects unsupported or oversized files before an intent", async () => { await expect(publishMoment({ file: new File(["x"], "x.gif", { type: "image/gif" }), publishConsent: true })).rejects.toThrow("JPEG ou PNG"); });
  it("orders checksum, intent, signed PUT, complete and publish with exact payloads", async () => {
    const order: string[] = [];
    vi.mocked(apiMutation).mockImplementation(async (path, options) => { order.push(path); if (path === "/media/upload-intents") { expect(options.body).toMatchObject({ fileName: "photo.jpg", contentType: "image/jpeg", size: 3, checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }); expect(options.idempotencyKey).toBe("intent-key"); return { id: "intent-1", uploadUrl: "https://upload.test", method: "PUT", headers: { "Content-Type": "image/jpeg" }, expiresAt: "2030-01-01T00:00:00Z" }; } if (path.endsWith("/complete")) { expect(options.body).toEqual({}); expect(options.idempotencyKey).toBe("complete-key"); return { assetId: "asset-1" }; } expect(path).toBe("/moments"); expect(options.body).toEqual({ assetId: "asset-1", participationId: "p1", publishConsent: true }); return { id: "moment-1" }; });
    vi.stubGlobal("fetch", vi.fn(async () => { order.push("PUT"); return new Response(null, { status: 200 }); }));
    await publishMoment({ file: new File(["abc"], "photo.jpg", { type: "image/jpeg" }), participationId: "p1", publishConsent: true });
    expect(order).toEqual(["/media/upload-intents", "PUT", "/media/upload-intents/intent-1/complete", "/moments"]);
  });
  it("retries incomplete complete with the same key and without a new intent", async () => {
    vi.mocked(apiMutation).mockReset().mockImplementationOnce(async () => ({ id: "intent-1", uploadUrl: "https://upload.test", method: "PUT", headers: {}, expiresAt: "2030-01-01T00:00:00Z" })).mockRejectedValueOnce(Object.assign(new Error("incomplete"), { code: "UPLOAD_INCOMPLETE" })).mockResolvedValueOnce({ assetId: "asset-1" }).mockResolvedValueOnce({ id: "moment-1" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    await publishMoment({ file: new File(["abc"], "photo.jpg", { type: "image/jpeg" }), publishConsent: false });
    expect(vi.mocked(apiMutation).mock.calls.filter(([path]) => path === "/media/upload-intents")).toHaveLength(1);
    const completeCalls = vi.mocked(apiMutation).mock.calls.filter(([path]) => String(path).endsWith("/complete"));
    expect(completeCalls).toHaveLength(2); expect(completeCalls[0][1].idempotencyKey).toBe(completeCalls[1][1].idempotencyKey);
  });
});
