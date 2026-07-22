import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { createServiceWorkerRuntime, type WorkerEnvironment } from "./sw";

class MemoryCache {
  entries = new Map<string, Response>();

  async match(request: RequestInfo | URL) {
    return this.entries.get(new Request(request).url)?.clone();
  }

  async put(request: RequestInfo | URL, response: Response) {
    this.entries.set(new Request(request).url, response.clone());
  }
}

class MemoryCacheStorage {
  stores = new Map<string, MemoryCache>();

  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new MemoryCache());
    return this.stores.get(name)!;
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async delete(name: string) {
    return this.stores.delete(name);
  }
}

const ORIGIN = "https://dnj.example";

function navigation(path = "/") {
  const value = new Request(new URL(path, ORIGIN));
  Object.defineProperty(value, "destination", { value: "document" });
  return value;
}

function staticRequest(path = "/_next/static/chunks/app.js") {
  return new Request(new URL(path, ORIGIN));
}

function assetRequest(path = "/icons/icon-192x192.png") {
  const value = new Request(new URL(path, ORIGIN));
  Object.defineProperty(value, "destination", { value: "image" });
  return value;
}

describe("versioned service worker runtime", () => {
  let storage: MemoryCacheStorage;
  let fetcher: Mock<(request: RequestInfo | URL) => Promise<Response>>;
  let claim: Mock<() => Promise<void>>;
  let skipWaiting: Mock<() => Promise<void>>;
  let runtime: ReturnType<typeof createServiceWorkerRuntime>;

  beforeEach(() => {
    storage = new MemoryCacheStorage();
    fetcher = vi.fn(async (request: RequestInfo | URL) => new Response(new Request(request).url));
    claim = vi.fn(async () => undefined);
    skipWaiting = vi.fn(async () => undefined);
    runtime = createServiceWorkerRuntime(
      {
        caches: storage as unknown as CacheStorage,
        fetch: fetcher as typeof fetch,
        clients: { claim: async () => claim() },
        skipWaiting: async () => skipWaiting(),
        origin: ORIGIN,
      } satisfies WorkerEnvironment,
      "rev-a",
    );
  });

  it("installs the minimum shell without activating itself", async () => {
    await runtime.install();

    expect((await storage.open("dnj-pwa-shell-rev-a")).entries.size).toBe(5);
    expect(skipWaiting).not.toHaveBeenCalled();
  });

  it("bypasses precaching and activates immediately during local development", async () => {
    const localRuntime = createServiceWorkerRuntime(
      {
        caches: storage as unknown as CacheStorage,
        fetch: fetcher as typeof fetch,
        clients: { claim: async () => claim() },
        skipWaiting: async () => skipWaiting(),
        origin: "http://localhost:3000",
      },
      "rev-local",
    );

    await localRuntime.install();
    await localRuntime.fetch(new Request("http://localhost:3000/_next/static/chunks/app.js"));

    expect(await storage.keys()).toEqual([]);
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("keeps successful shell entries when one asset fails", async () => {
    fetcher.mockImplementation(async (request: RequestInfo | URL) => {
      const url = new Request(request).url;
      if (url.endsWith("icon-512x512.png")) throw new Error("asset unavailable");
      return new Response(url);
    });

    await runtime.install();

    expect((await storage.open("dnj-pwa-shell-rev-a")).entries.size).toBe(4);
  });

  it("activates by deleting only old DNJ caches and claiming clients", async () => {
    await storage.open("dnj-pwa-shell-old");
    await storage.open("dnj-pwa-static-rev-a");
    await storage.open("unrelated-cache");

    await runtime.activate();

    expect(await storage.keys()).toEqual(expect.arrayContaining(["dnj-pwa-static-rev-a", "unrelated-cache"]));
    expect(await storage.keys()).not.toContain("dnj-pwa-shell-old");
    expect(claim).toHaveBeenCalledOnce();
  });

  it("serves navigation network-first and stores the response", async () => {
    const response = await runtime.fetch(navigation("/game"));

    expect(await response.text()).toBe(`${ORIGIN}/game`);
    expect(await (await storage.open("dnj-pwa-shell-rev-a")).match(`${ORIGIN}/game`)).toBeDefined();
  });

  it("falls back to the cached shell when navigation network fails", async () => {
    const cache = await storage.open("dnj-pwa-shell-rev-a");
    await cache.put(`${ORIGIN}/`, new Response("offline shell"));
    fetcher.mockRejectedValue(new Error("offline"));

    expect(await (await runtime.fetch(navigation("/game"))).text()).toBe("offline shell");
  });

  it("returns an explicit unavailable response on first offline access", async () => {
    fetcher.mockRejectedValue(new Error("offline"));

    const response = await runtime.fetch(navigation());

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Aplicativo indisponível offline antes da primeira carga.");
  });

  it("serves Next static resources cache-first", async () => {
    const cache = await storage.open("dnj-pwa-static-rev-a");
    await cache.put(`${ORIGIN}/_next/static/chunks/app.js`, new Response("cached chunk"));

    expect(await (await runtime.fetch(staticRequest())).text()).toBe("cached chunk");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches and stores an allowlisted local asset after a cache miss", async () => {
    await runtime.fetch(assetRequest());

    expect(await (await storage.open("dnj-pwa-assets-rev-a")).match(`${ORIGIN}/icons/icon-192x192.png`)).toBeDefined();
  });

  it("keeps API requests network-only", async () => {
    const apiRequest = new Request(`${ORIGIN}/v1/ranking`);

    await runtime.fetch(apiRequest);

    expect(fetcher).toHaveBeenCalledWith(apiRequest);
    expect((await storage.open("dnj-pwa-assets-rev-a")).entries.size).toBe(0);
  });

  it("does not cache an allowlisted request carrying Authorization", async () => {
    const protectedAsset = new Request(`${ORIGIN}/_next/static/chunks/private.js`, {
      headers: { Authorization: "Bearer secret" },
    });

    await runtime.fetch(protectedAsset);

    expect((await storage.open("dnj-pwa-static-rev-a")).entries.size).toBe(0);
  });

  it("warms only validated URLs and reports the active revision", async () => {
    const postMessage = vi.fn();

    await runtime.message({ type: "CACHE_URLS", urls: [`${ORIGIN}/_next/static/chunks/app.js`] }, { postMessage });

    expect(postMessage).toHaveBeenCalledWith({ type: "CACHE_READY", revision: "rev-a" });
    expect(await (await storage.open("dnj-pwa-static-rev-a")).match(`${ORIGIN}/_next/static/chunks/app.js`)).toBeDefined();
  });

  it("rejects a forbidden warmup URL with a sanitized error", async () => {
    const postMessage = vi.fn();

    await runtime.message({ type: "CACHE_URLS", urls: [`${ORIGIN}/v1/users?token=secret`] }, { postMessage });

    expect(postMessage).toHaveBeenCalledWith({ type: "CACHE_ERROR", reason: "CACHE_URL_REJECTED" });
    expect(JSON.stringify(postMessage.mock.calls)).not.toContain("secret");
  });

  it("retains warmed entries when a later warmup fetch fails", async () => {
    const postMessage = vi.fn();
    fetcher.mockImplementation(async (request: RequestInfo | URL) => {
      const url = new Request(request).url;
      if (url.endsWith("two.js")) throw new Error("offline token=secret");
      return new Response(url);
    });

    await runtime.message(
      { type: "CACHE_URLS", urls: [`${ORIGIN}/_next/static/one.js`, `${ORIGIN}/_next/static/two.js`] },
      { postMessage },
    );

    expect(await (await storage.open("dnj-pwa-static-rev-a")).match(`${ORIGIN}/_next/static/one.js`)).toBeDefined();
    expect(postMessage).toHaveBeenCalledWith({ type: "CACHE_ERROR", reason: "CACHE_WRITE_FAILED" });
  });

  it("calls skipWaiting only for the explicit message", async () => {
    await runtime.message({ type: "UNKNOWN" }, undefined);
    expect(skipWaiting).not.toHaveBeenCalled();

    await runtime.message({ type: "SKIP_WAITING" }, undefined);
    expect(skipWaiting).toHaveBeenCalledOnce();
  });
});
