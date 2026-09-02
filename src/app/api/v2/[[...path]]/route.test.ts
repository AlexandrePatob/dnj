import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("V2 proxy", () => {
  it("maps auth cookie paths to the public proxy path", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      headers: { "Set-Cookie": "refresh_token=token; Path=/v2/auth; HttpOnly" },
    })));

    const response = await POST(new Request("https://game.test/api/v2/auth/refresh", { method: "POST" }), { params: Promise.resolve({ path: ["auth", "refresh"] }) });

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/refresh"), expect.anything());
    expect(response.headers.get("set-cookie")).toContain("Path=/api/v2/auth");
    vi.unstubAllGlobals();
  });
});
