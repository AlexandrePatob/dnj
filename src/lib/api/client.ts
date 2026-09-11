import { env } from "../env";
import { authStorage, isStoredCredentials } from "../auth-storage";
type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string; refreshOnUnauthorized?: boolean };
export type ApiErrorCode = "OFFLINE" | "TIMEOUT" | "NETWORK" | string;
export class ApiError extends Error { constructor(message: string, public readonly status: number, public readonly details?: unknown, public readonly code?: ApiErrorCode, public readonly requestId?: string) { super(message); this.name = "ApiError"; } }
let refreshPromise: Promise<boolean> | null = null;
let currentCsrfToken: string | undefined;
const mutationAttempts = 3;
export function setCsrfToken(token?: string) { currentCsrfToken = token || undefined; if (token) authStorage.setCsrfToken(token); }
const publishedCsrfToken = () => typeof document === "undefined" ? undefined : document.cookie.split(";").map((x) => x.trim()).find((x) => x.startsWith("csrf_token="))?.slice(11);
const csrfToken = () => publishedCsrfToken() ?? currentCsrfToken ?? authStorage.getCsrfToken();
// The current API returns the bearer token in JSON and keeps refresh state in its cookie.
// Retain support for a future JSON refresh token without making it a prerequisite to persist access.
const rememberCredentials = (data: unknown) => {
  if (isStoredCredentials(data)) authStorage.setAccessToken(data.accessToken);
  if (data && typeof data === "object" && "refreshToken" in data && typeof data.refreshToken === "string" && data.refreshToken) authStorage.setCredentials({ accessToken: authStorage.getAccessToken() ?? "", refreshToken: data.refreshToken });
  if (data && typeof data === "object" && "csrfToken" in data && typeof data.csrfToken === "string") setCsrfToken(data.csrfToken);
};
async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("Sem conexão com a internet. Conecte-se e tente novamente.", 0, undefined, "OFFLINE");
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try { const { refreshOnUnauthorized, token, ...requestInit } = options; void refreshOnUnauthorized; const bearer = token ?? authStorage.getAccessToken(); const csrf = csrfToken(); const response = await fetch(`${env.apiUrl}${path}`, { ...requestInit, credentials: "include", signal: controller.signal, headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(csrf ? { "X-CSRF-Token": csrf } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined }); const data = await response.json().catch(() => null); if (!response.ok) { const e = data?.code && data?.message ? data : data?.error; throw new ApiError(e?.message ?? data?.message ?? "Não foi possível concluir a solicitação.", response.status, e?.details ?? data, e?.code, e?.requestId); } rememberCredentials(data); return data as T; }
  catch (error) { if (error instanceof ApiError) throw error; if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("A API demorou para responder. Tente novamente.", 408, undefined, "TIMEOUT"); throw new ApiError("Não foi possível conectar à API.", 0, error, "NETWORK"); } finally { window.clearTimeout(timeout); }
}
// Rotates the cookie session once for all concurrent 401s. A rejected refresh drops local credentials.
async function refreshSession(): Promise<boolean> {
  const refreshToken = authStorage.getRefreshToken();
  try { await requestOnce("/auth/refresh", { method: "POST", ...(refreshToken ? { body: { refreshToken } } : {}), token: "", refreshOnUnauthorized: false }); return true; }
  catch (error) { if (error instanceof ApiError && error.status !== 0 && error.status !== 408) authStorage.clearCredentials(); return false; }
}
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> { try { return await requestOnce<T>(path, options); } catch (error) { if (!(error instanceof ApiError) || error.status !== 401 || path === "/auth/refresh" || options.refreshOnUnauthorized === false) throw error; refreshPromise ??= refreshSession().finally(() => { refreshPromise = null; }); if (!(await refreshPromise)) throw error; return requestOnce<T>(path, { ...options, token: undefined }); } }
export function newIdempotencyKey() { return globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }); }
export async function apiMutation<T>(path: string, options: RequestOptions & { method: string; idempotencyKey?: string }): Promise<T> {
  const idempotencyKey = options.idempotencyKey ?? newIdempotencyKey();
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await apiRequest<T>(path, { ...options, headers: { "Idempotency-Key": idempotencyKey, ...options.headers } });
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500);
      if (!retryable || attempt === mutationAttempts) throw error;
    }
  }
}
