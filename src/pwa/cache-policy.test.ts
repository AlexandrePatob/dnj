import { describe, expect, it } from "vitest";
import { classifyRequest, isCacheableResponse } from "./cache-policy";

const APP_ORIGIN = "https://dnj.example";

function request(path: string, init: RequestInit & { destination?: RequestDestination } = {}) {
  const value = new Request(new URL(path, APP_ORIGIN), init);
  if (init.destination) {
    Object.defineProperty(value, "destination", { value: init.destination });
  }
  return value;
}

describe("cache allowlist policy", () => {
  it("uses network-first only for same-origin document navigation", () => {
    expect(classifyRequest(request("/", { destination: "document" }), APP_ORIGIN)).toBe(
      "navigation-network-first",
    );
  });

  it("uses cache-first for Next static build assets", () => {
    expect(classifyRequest(request("/_next/static/chunks/app.js"), APP_ORIGIN)).toBe("static-cache-first");
  });

  it("keeps local development requests on the network", () => {
    const localOrigin = "http://localhost:3000";
    const localRequest = new Request(`${localOrigin}/_next/static/chunks/app.js`);
    expect(classifyRequest(localRequest, localOrigin)).toBe("network-only");
  });

  it("uses cache-first for an approved local image destination", () => {
    expect(classifyRequest(request("/icons/icon-192x192.png", { destination: "image" }), APP_ORIGIN)).toBe(
      "asset-cache-first",
    );
  });

  it("uses cache-first for an approved local font destination", () => {
    expect(classifyRequest(request("/_next/static/media/poppins.woff2", { destination: "font" }), APP_ORIGIN)).toBe(
      "asset-cache-first",
    );
  });

  it("uses cache-first for the local web manifest", () => {
    expect(classifyRequest(request("/manifest.webmanifest", { destination: "manifest" }), APP_ORIGIN)).toBe(
      "asset-cache-first",
    );
  });

  it("rejects unapproved extensions even with an approved destination", () => {
    expect(classifyRequest(request("/icons/private.json", { destination: "image" }), APP_ORIGIN)).toBe(
      "network-only",
    );
  });

  it("rejects approved extensions with an unapproved destination", () => {
    expect(classifyRequest(request("/download/icon.png", { destination: "script" }), APP_ORIGIN)).toBe(
      "network-only",
    );
  });

  it("never caches API paths", () => {
    expect(classifyRequest(request("/v1/ranking", { destination: "document" }), APP_ORIGIN)).toBe("network-only");
  });

  it("never caches requests carrying Authorization", () => {
    expect(classifyRequest(request("/icons/icon.png", { headers: { Authorization: "Bearer secret" } }), APP_ORIGIN)).toBe(
      "network-only",
    );
  });

  it("never caches non-GET requests", () => {
    expect(classifyRequest(request("/icons/icon.png", { method: "POST" }), APP_ORIGIN)).toBe("network-only");
  });

  it("never caches cross-origin resources including analytics", () => {
    expect(classifyRequest(new Request("https://analytics.example/collect"), APP_ORIGIN)).toBe("network-only");
  });

  it("accepts only successful non-opaque responses", () => {
    expect(isCacheableResponse(new Response("ok", { status: 200 }))).toBe(true);
    expect(isCacheableResponse(new Response("error", { status: 500 }))).toBe(false);
    expect(isCacheableResponse({ ok: true, type: "opaque" } as Response)).toBe(false);
  });
});
