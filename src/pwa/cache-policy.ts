export type CacheStrategy =
  | "network-only"
  | "navigation-network-first"
  | "static-cache-first"
  | "asset-cache-first";

const IMAGE_EXTENSIONS = new Set([".avif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const FONT_EXTENSIONS = new Set([".woff", ".woff2"]);
const MANIFEST_EXTENSIONS = new Set([".webmanifest"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "::1"]);

export function isLocalDevelopmentOrigin(origin: string): boolean {
  return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
}

function extensionOf(pathname: string): string {
  const filename = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex === -1 ? "" : filename.slice(dotIndex).toLowerCase();
}

function isApprovedAsset(request: Request, pathname: string): boolean {
  const extension = extensionOf(pathname);

  if (request.destination === "image") return IMAGE_EXTENSIONS.has(extension);
  if (request.destination === "font") return FONT_EXTENSIONS.has(extension);
  if (request.destination === "manifest") return MANIFEST_EXTENSIONS.has(extension);

  return false;
}

export function classifyRequest(request: Request, appOrigin: string): CacheStrategy {
  const url = new URL(request.url);

  if (
    isLocalDevelopmentOrigin(appOrigin) ||
    request.method !== "GET" ||
    url.origin !== appOrigin ||
    request.headers.has("Authorization") ||
    url.pathname === "/v1" ||
    url.pathname.startsWith("/v1/") ||
    url.pathname === "/api/v2" ||
    url.pathname.startsWith("/api/v2/")
  ) {
    return "network-only";
  }

  if (request.mode === "navigate" || request.destination === "document") {
    return "navigation-network-first";
  }

  if (isApprovedAsset(request, url.pathname)) {
    return "asset-cache-first";
  }

  if (url.pathname.startsWith("/_next/static/")) {
    return "static-cache-first";
  }

  return "network-only";
}

export function isCacheableResponse(response: Response): boolean {
  return response.ok && response.type !== "opaque" && response.type !== "error";
}
