import { env } from "../env";
import { authStorage, isStoredCredentials } from "../auth-storage";
type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string; refreshOnUnauthorized?: boolean };
export type ApiErrorCode = "OFFLINE" | "TIMEOUT" | "NETWORK" | string;
export class ApiError extends Error { constructor(message: string, public readonly status: number, public readonly details?: unknown, public readonly code?: ApiErrorCode, public readonly requestId?: string) { super(message); this.name = "ApiError"; } }
let refreshPromise: Promise<boolean> | null = null;
const mutationAttempts = 3;
// Every response carrying a fresh token pair (login, code verification, refresh) becomes the persisted session.
const rememberCredentials = (data: unknown) => { if (isStoredCredentials(data)) authStorage.setCredentials({ accessToken: data.accessToken, refreshToken: data.refreshToken }); };
async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("Sem conexão com a internet. Conecte-se e tente novamente.", 0, undefined, "OFFLINE");
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try { const { refreshOnUnauthorized, token, ...requestInit } = options; void refreshOnUnauthorized; const bearer = token ?? authStorage.getAccessToken(); const response = await fetch(`${env.apiUrl}${path}`, { ...requestInit, signal: controller.signal, headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined }); const data = await response.json().catch(() => null); if (!response.ok) { const e = data?.code && data?.message ? data : data?.error; throw new ApiError(e?.message ?? data?.message ?? "Não foi possível concluir a solicitação.", response.status, e?.details ?? data, e?.code, e?.requestId); } rememberCredentials(data); return data as T; }
  catch (error) { if (error instanceof ApiError) throw error; if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("A API demorou para responder. Tente novamente.", 408, undefined, "TIMEOUT"); throw new ApiError("Não foi possível conectar à API.", 0, error, "NETWORK"); } finally { window.clearTimeout(timeout); }
}
// Rotates the session once for all concurrent 401s. A rejected refresh drops the stored credentials.
async function refreshSession(): Promise<boolean> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return false;
  try { await requestOnce("/auth/refresh", { method: "POST", body: { refreshToken }, token: "", refreshOnUnauthorized: false }); return true; }
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
