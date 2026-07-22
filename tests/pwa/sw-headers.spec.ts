import { expect, test } from "@playwright/test";

test.describe("service worker response headers", () => {
  test("serves JavaScript with an explicit UTF-8 content type", async ({ request }) => {
    const response = await request.get("/sw.js");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/javascript; charset=utf-8");
  });

  test("requires HTTP revalidation instead of prolonged caching", async ({ request }) => {
    const response = await request.get("/sw.js");

    expect(response.headers()["cache-control"]).toBe("no-cache, no-store, must-revalidate");
  });

  test("restricts worker scripts to the same origin", async ({ request }) => {
    const response = await request.get("/sw.js");

    expect(response.headers()["content-security-policy"]).toBe(
      "default-src 'none'; script-src 'self'; connect-src *",
    );
  });

  test("allows the worker to control only the application root scope", async ({ request }) => {
    const response = await request.get("/sw.js");

    expect(response.headers()["service-worker-allowed"]).toBe("/");
  });
});
