type QueryValue = string | number | boolean | null | undefined;

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase não está configurado no servidor.");
  return { url, key };
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Content-Type", "application/json");
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase respondeu ${response.status}.`);
  if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export async function supabaseStorage(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  if (key.startsWith("eyJ")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${url}/storage/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Storage respondeu ${response.status}.`);
  return response;
}

export function query(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) search.set(key, String(value));
  return search.toString();
}
