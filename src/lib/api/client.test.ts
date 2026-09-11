import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authStorage } from "../auth-storage";
import { ApiError, apiMutation, apiRequest } from "./client";

const API = "https://api.dnj.test/v2";

function response(body: unknown, init: { status?: number; contentType?: string } = {}) {
  const contentType = init.contentType ?? "application/json";
  return new Response(contentType.includes("json") ? JSON.stringify(body) : String(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": contentType },
  });
}

const unauthorized = () => response({ code: "UNAUTHENTICATED", message: "expired" }, { status: 401 });
const rotated = (suffix: string) => ({ accessToken: `access-${suffix}`, refreshToken: `refresh-${suffix}`, tokenType: "Bearer", expiresIn: 900, refreshExpiresIn: 2592000 });
const initOf = (index: number) => vi.mocked(fetch).mock.calls[index][1] as RequestInit & { headers: Record<string, string> };

describe("apiRequest offline behavior", () => {
  beforeEach(() => {
    authStorage.clearCredentials();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fails before fetch with a distinguishable Portuguese offline error", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const failure = apiRequest("/ranking");
    await expect(failure).rejects.toMatchObject({
      message: "Sem conexão com a internet. Conecte-se e tente novamente.",
      status: 0,
      code: "OFFLINE",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows a new call after the browser reports reconnection", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    await expect(apiRequest("/ranking")).rejects.toBeInstanceOf(ApiError);
    vi.stubGlobal("navigator", { onLine: true });
    vi.mocked(fetch).mockResolvedValueOnce(response({ points: 120 }));
    await expect(apiRequest<{ points: number }>("/ranking")).resolves.toEqual({ points: 120 });
  });

  it("preserves a JSON HTTP error and its API details while online", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Serviço indisponível" }, { status: 503 }));
    await expect(apiRequest("/ranking")).rejects.toMatchObject({
      message: "Serviço indisponível",
      status: 503,
      details: { message: "Serviço indisponível" },
    });
  });

  it("keeps timeout failures distinct from offline state", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.mocked(fetch).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const failure = apiRequest("/slow");
    const rejection = expect(failure).rejects.toMatchObject({ status: 408, code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
  });

  it("keeps real network failures distinct while navigator is online", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network down"));
    await expect(apiRequest("/ranking")).rejects.toMatchObject({
      message: "Não foi possível conectar à API.",
      status: 0,
      code: "NETWORK",
    });
  });

  it("returns parsed JSON responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ok: true }));
    await expect(apiRequest<{ ok: boolean }>("/status")).resolves.toEqual({ ok: true });
  });

  it("returns null for successful non-JSON responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response("accepted", { contentType: "text/plain" }));
    await expect(apiRequest("/status")).resolves.toBeNull();
  });

  it("calls the external API with the stored bearer token and no cookies or CSRF", async () => {
    authStorage.setCredentials({ accessToken: "stored-access", refreshToken: "stored-refresh" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ok: true }));
    await apiRequest("/groups", {
      method: "POST",
      body: { group: "São José" },
      headers: { "X-Request-ID": "test-request" },
    });
    expect(fetch).toHaveBeenCalledWith(`${API}/groups`, expect.objectContaining({
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer stored-access",
        "X-Request-ID": "test-request",
      },
      body: JSON.stringify({ group: "São José" }),
    }));
    expect(initOf(0)).not.toHaveProperty("credentials");
    expect(initOf(0).headers).not.toHaveProperty("X-CSRF-Token");
  });

  it("lets an explicit token override the stored one", async () => {
    authStorage.setCredentials({ accessToken: "stored-access", refreshToken: "stored-refresh" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ok: true }));
    await apiRequest("/profile", { token: "explicit-token" });
    expect(initOf(0).headers).toEqual(expect.objectContaining({ Authorization: "Bearer explicit-token" }));
  });

  it("persists the token pair returned by a login response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...rotated("login"), user: { id: "1" }, onboardingRequired: false }));
    await apiRequest("/auth/google", { method: "POST", body: { idToken: "google" } });
    expect(authStorage.getAccessToken()).toBe("access-login");
    expect(authStorage.getRefreshToken()).toBe("refresh-login");
  });

  it("does exactly one concurrent refresh and replays each original request with the rotated token", async () => {
    authStorage.setCredentials({ accessToken: "access-old", refreshToken: "refresh-old" });
    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(response(rotated("new")))
      .mockResolvedValueOnce(response({ value: 1 }))
      .mockResolvedValueOnce(response({ value: 2 }));
    await expect(Promise.all([apiRequest("/one"), apiRequest("/two")])).resolves.toEqual([{ value: 1 }, { value: 2 }]);
    expect(fetch).toHaveBeenCalledTimes(5);
    const refreshCalls = vi.mocked(fetch).mock.calls.filter(([url]) => url === `${API}/auth/refresh`);
    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0][1]).toEqual(expect.objectContaining({ method: "POST", body: JSON.stringify({ refreshToken: "refresh-old" }) }));
    expect((refreshCalls[0][1] as RequestInit).headers).not.toHaveProperty("Authorization");
    expect(initOf(3).headers).toEqual(expect.objectContaining({ Authorization: "Bearer access-new" }));
    expect(initOf(4).headers).toEqual(expect.objectContaining({ Authorization: "Bearer access-new" }));
    expect(authStorage.getRefreshToken()).toBe("refresh-new");
  });

  it("clears credentials and propagates the 401 when the refresh is rejected", async () => {
    authStorage.setCredentials({ accessToken: "access-old", refreshToken: "refresh-old" });
    vi.mocked(fetch)
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(response({ code: "REFRESH_TOKEN_REUSE", message: "revoked" }, { status: 401 }));
    await expect(apiRequest("/ranking")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
  });

  it("does not attempt a refresh without a stored refresh token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized());
    await expect(apiRequest("/ranking")).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not refresh an unauthenticated session probe", async () => {
    authStorage.setCredentials({ accessToken: "access-old", refreshToken: "refresh-old" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ code: "AUTH_REQUIRED", message: "login required" }, { status: 401 }));
    await expect(apiRequest("/auth/session", { refreshOnUnauthorized: false })).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves the complete V2 error envelope", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ code: "BAD_INPUT", message: "Campo inválido", details: { field: "name" }, requestId: "req-1" }, { status: 422 }));
    await expect(apiRequest("/profile")).rejects.toMatchObject({ code: "BAD_INPUT", message: "Campo inválido", details: { field: "name" }, requestId: "req-1", status: 422 });
  });

  it("does not retry a mutation conflict", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ code: "IDEMPOTENCY_KEY_REUSED", message: "Conflito", requestId: "req-2" }, { status: 409 }));
    await expect(apiMutation("/moments", { method: "POST", body: {}, idempotencyKey: "same-key" })).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_KEY_REUSED", requestId: "req-2" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries transient mutations three times with the same idempotency key", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ message: "Indisponível" }, { status: 503 }))
      .mockResolvedValueOnce(response({ message: "Indisponível" }, { status: 503 }))
      .mockResolvedValueOnce(response({ ok: true }));
    await expect(apiMutation("/admin/activities", { method: "POST", body: {}, idempotencyKey: "same-key" })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const [, init] of vi.mocked(fetch).mock.calls)
      expect((init as RequestInit).headers).toEqual(expect.objectContaining({ "Idempotency-Key": "same-key" }));
  });
});
