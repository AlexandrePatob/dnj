import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "./client";

function response(body: unknown, init: { status?: number; contentType?: string } = {}) {
  const contentType = init.contentType ?? "application/json";
  return new Response(contentType.includes("json") ? JSON.stringify(body) : String(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": contentType },
  });
}

describe("apiRequest offline behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("preserves authentication, JSON, accept, and caller headers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ ok: true }));
    await apiRequest("/groups", {
      method: "POST",
      token: "test-token",
      body: { group: "São José" },
      headers: { "X-Request-ID": "test-request" },
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8080/v1/groups", expect.objectContaining({
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
        "X-Request-ID": "test-request",
      },
      body: JSON.stringify({ group: "São José" }),
    }));
  });
});
