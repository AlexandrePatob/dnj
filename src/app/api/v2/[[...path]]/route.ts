const defaultUpstream = "https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2";
const upstream = () => (process.env.DNJ_V2_UPSTREAM_URL ?? defaultUpstream).replace(/\/$/, "");

function rewriteCookiePath(cookie: string) {
  return cookie.replace(/;\s*Path=\/v2\/auth(?=;|$)/i, "; Path=/api/v2/auth");
}

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const response = await fetch(`${upstream()}/${path.join("/")}${url.search}`, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    cache: "no-store",
    // The request body is a stream when proxied by Next.
    // @ts-expect-error Node fetch requires duplex for streamed request bodies.
    duplex: "half",
  });
  const responseHeaders = new Headers(response.headers);
  const cookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie")?.split(/,(?=\s*[^;=]+=[^;]+)/) ?? [];
  responseHeaders.delete("set-cookie");
  for (const cookie of cookies) responseHeaders.append("set-cookie", rewriteCookiePath(cookie));
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
