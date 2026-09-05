import { env } from "../env";
type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; token?: string };
export type ApiErrorCode = "OFFLINE" | "TIMEOUT" | "NETWORK" | string;
export class ApiError extends Error { constructor(message: string, public readonly status: number, public readonly details?: unknown, public readonly code?: ApiErrorCode, public readonly requestId?: string) { super(message); this.name = "ApiError"; } }
let refreshPromise: Promise<void> | null = null;
let currentCsrfToken: string | undefined;
let sessionExpiredHandler: (() => void) | undefined;
const mutationAttempts = 3;
export function setCsrfToken(token?: string) { currentCsrfToken = token || undefined; }
export function setSessionExpiredHandler(handler?: () => void) { sessionExpiredHandler = handler; }
const csrfToken = () => currentCsrfToken ?? (typeof document === "undefined" ? undefined : document.cookie.split(";").map((x) => x.trim()).find((x) => x.startsWith("csrf_token="))?.slice(11));
const rememberCsrfToken = (data: unknown) => {
  if (data && typeof data === "object" && "csrfToken" in data && typeof data.csrfToken === "string") setCsrfToken(data.csrfToken);
};
async function requestOnce<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("Sem conexão com a internet. Conecte-se e tente novamente.", 0, undefined, "OFFLINE");
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try { const token = csrfToken(); const response = await fetch(`${env.apiBaseUrl}${path}`, { ...options, credentials: "include", signal: controller.signal, headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(token ? { "X-CSRF-Token": token } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined }); const data = await response.json().catch(() => null); if (!response.ok) { const e = data?.code && data?.message ? data : data?.error; throw new ApiError(e?.message ?? data?.message ?? "Não foi possível concluir a solicitação.", response.status, e?.details ?? data, e?.code, e?.requestId); } rememberCsrfToken(data); return data as T; }
  catch (error) { if (error instanceof ApiError) throw error; if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("A API demorou para responder. Tente novamente.", 408, undefined, "TIMEOUT"); throw new ApiError("Não foi possível conectar à API.", 0, error, "NETWORK"); } finally { window.clearTimeout(timeout); }
}
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> { try { return await requestOnce<T>(path, options); } catch (error) { if (!(error instanceof ApiError) || error.status !== 401 || path === "/auth/refresh") throw error; refreshPromise ??= requestOnce<void>("/auth/refresh", { method: "POST" }).catch((refreshError) => { if (refreshError instanceof ApiError && (refreshError.status === 401 || refreshError.status === 403)) sessionExpiredHandler?.(); throw refreshError; }).finally(() => { refreshPromise = null; }); try { await refreshPromise; } catch (refreshError) { if (refreshError instanceof ApiError && (refreshError.status === 401 || refreshError.status === 403)) throw error; throw refreshError; } return requestOnce<T>(path, options); } }
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
