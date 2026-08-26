import {
  classifyRequest,
  isCacheableResponse,
  isLocalDevelopmentOrigin,
  type CacheStrategy,
} from "./cache-policy";

declare const __PWA_REVISION__: string;

const CACHE_PREFIX = "dnj-pwa-";
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

export interface WorkerEnvironment {
  caches: CacheStorage;
  fetch: typeof fetch;
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  origin: string;
}

type WorkerMessage = { type: string; urls?: unknown };

interface MessageTarget {
  postMessage(message: { type: "CACHE_READY"; revision: string } | { type: "CACHE_ERROR"; reason: string }): void;
}

function cacheName(strategy: CacheStrategy, revision: string): string | null {
  if (strategy === "navigation-network-first") return `${CACHE_PREFIX}shell-${revision}`;
  if (strategy === "static-cache-first") return `${CACHE_PREFIX}static-${revision}`;
  if (strategy === "asset-cache-first") return `${CACHE_PREFIX}assets-${revision}`;
  return null;
}

export function createServiceWorkerRuntime(environment: WorkerEnvironment, revision: string) {
  const names = {
    shell: `${CACHE_PREFIX}shell-${revision}`,
    static: `${CACHE_PREFIX}static-${revision}`,
    assets: `${CACHE_PREFIX}assets-${revision}`,
  };
  const currentCaches = new Set(Object.values(names));

  async function putIfCacheable(cache: Cache, request: Request, response: Response): Promise<boolean> {
    if (!isCacheableResponse(response)) return false;
    await cache.put(request, response.clone());
    return true;
  }

  async function install(): Promise<void> {
    if (isLocalDevelopmentOrigin(environment.origin)) {
      await environment.skipWaiting();
      return;
    }
    const cache = await environment.caches.open(names.shell);
    await environment.caches.open(names.static);

    await Promise.all(
      SHELL_URLS.map(async (path) => {
        const request = new Request(new URL(path, environment.origin), { cache: "reload" });
        try {
          const response = await environment.fetch(request);
          await putIfCacheable(cache, request, response);
        } catch {
          // A partial asset failure must not discard the shell entries already stored.
        }
      }),
    );
  }

  async function activate(): Promise<void> {
    const existing = await environment.caches.keys();
    await Promise.all(
      existing
        .filter((name) => name.startsWith(CACHE_PREFIX) && !currentCaches.has(name))
        .map((name) => environment.caches.delete(name)),
    );
    await environment.clients.claim();
  }

  async function networkFirst(request: Request): Promise<Response> {
    const cache = await environment.caches.open(names.shell);
    try {
      const response = await environment.fetch(request);
      await putIfCacheable(cache, request, response);
      return response;
    } catch {
      const exact = await cache.match(request);
      const shell = exact ?? (await cache.match(new URL("/", environment.origin).href));
      return (
        shell ??
        new Response("Aplicativo indisponível offline antes da primeira carga.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }
  }

  async function cacheFirst(request: Request, strategy: CacheStrategy): Promise<Response> {
    const name = cacheName(strategy, revision);
    if (!name) return environment.fetch(request);

    const cache = await environment.caches.open(name);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await environment.fetch(request);
    await putIfCacheable(cache, request, response);
    return response;
  }

  async function handleFetch(request: Request): Promise<Response> {
    const strategy = classifyRequest(request, environment.origin);
    if (strategy === "navigation-network-first") return networkFirst(request);
    if (strategy === "static-cache-first" || strategy === "asset-cache-first") {
      return cacheFirst(request, strategy);
    }
    return environment.fetch(request);
  }

  async function warmUrls(urls: string[]): Promise<"CACHE_URL_REJECTED" | "CACHE_WRITE_FAILED" | null> {
    let writeFailed = false;

    for (const value of urls) {
      let request: Request;
      try {
        request = new Request(new URL(value, environment.origin));
      } catch {
        return "CACHE_URL_REJECTED";
      }

      const strategy = classifyRequest(request, environment.origin);
      if (strategy !== "static-cache-first") return "CACHE_URL_REJECTED";

      try {
        await cacheFirst(request, strategy);
      } catch {
        writeFailed = true;
      }
    }

    return writeFailed ? "CACHE_WRITE_FAILED" : null;
  }

  async function message(data: WorkerMessage, source?: MessageTarget): Promise<void> {
    if (data.type === "SKIP_WAITING") {
      await environment.skipWaiting();
      return;
    }

    if (data.type !== "CACHE_URLS") return;
    if (!Array.isArray(data.urls) || !data.urls.every((url): url is string => typeof url === "string")) {
      source?.postMessage({ type: "CACHE_ERROR", reason: "CACHE_URL_REJECTED" });
      return;
    }
    const reason = await warmUrls(data.urls);
    if (reason) {
      source?.postMessage({ type: "CACHE_ERROR", reason });
      return;
    }
    source?.postMessage({ type: "CACHE_READY", revision });
  }

  return { install, activate, fetch: handleFetch, message };
}

interface WorkerScopeLike {
  caches: CacheStorage;
  clients: { claim(): Promise<void> };
  location: Location;
  skipWaiting(): Promise<void>;
  addEventListener(type: string, listener: (event: never) => void): void;
  registration: { showNotification(title: string, options?: NotificationOptions): Promise<void> };
}

const scope = globalThis as unknown as WorkerScopeLike;
if (typeof scope.addEventListener === "function" && typeof scope.skipWaiting === "function" && scope.caches) {
  const revision = typeof __PWA_REVISION__ === "string" ? __PWA_REVISION__ : "development";
  const runtime = createServiceWorkerRuntime(
    {
      caches: scope.caches,
      clients: scope.clients,
      fetch: globalThis.fetch.bind(globalThis),
      origin: scope.location.origin,
      skipWaiting: scope.skipWaiting.bind(scope),
    },
    revision,
  );

  scope.addEventListener("install", ((event: { waitUntil(promise: Promise<void>): void }) => {
    event.waitUntil(runtime.install());
  }) as never);
  scope.addEventListener("activate", ((event: { waitUntil(promise: Promise<void>): void }) => {
    event.waitUntil(runtime.activate());
  }) as never);
  scope.addEventListener("fetch", ((event: { request: Request; respondWith(response: Promise<Response>): void }) => {
    if (classifyRequest(event.request, scope.location.origin) === "network-only") return;
    event.respondWith(runtime.fetch(event.request));
  }) as never);
  scope.addEventListener(
    "message",
    ((event: { data: WorkerMessage; source?: MessageTarget; waitUntil?(promise: Promise<void>): void }) => {
      const operation = runtime.message(event.data, event.source);
      event.waitUntil?.(operation);
    }) as never,
  );
  scope.addEventListener("push", ((event: { data?: { json(): { title?: string; body?: string; url?: string } }; waitUntil(promise: Promise<void>): void }) => {
    const payload = event.data?.json() ?? {};
    event.waitUntil(scope.registration.showNotification(payload.title ?? "DNJ Game", { body: payload.body ?? "Você tem uma novidade.", data: { url: payload.url ?? "/" }, icon: "/icons/icon-192x192.png" }));
  }) as never);
}
