import { describe, expect, it } from "vitest";
import { publishMoment } from "./media";
describe("publishMoment", () => { it("rejects unsupported or oversized files before an intent", async () => { await expect(publishMoment({ file: new File(["x"], "x.gif", { type: "image/gif" }), publishConsent: true })).rejects.toThrow("JPEG ou PNG"); }); });
