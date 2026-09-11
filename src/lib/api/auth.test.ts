import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authStorage } from "../auth-storage";
import { authApi } from "./auth";

const API = "https://api.dnj.test/v2";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("authApi session lifecycle", () => {
  beforeEach(() => {
    authStorage.clearCredentials();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("stores the access and CSRF tokens after verifying an e-mail code", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "a1", csrfToken: "csrf-1", tokenType: "Bearer", expiresIn: 900, user: { id: "1", role: "DEFAULT" }, onboardingRequired: true }));
    await authApi.verifyCode("ana@example.com", "123456");
    expect(authStorage.getAccessToken()).toBe("a1");
    expect(authStorage.getCsrfToken()).toBe("csrf-1");
  });

  it("refreshes through the HttpOnly cookie and clears state when refused", async () => {
    authStorage.setCredentials({ accessToken: "a1", refreshToken: "r1" });
    authStorage.setCsrfToken("csrf-1");
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "a2", csrfToken: "csrf-2", tokenType: "Bearer", expiresIn: 900, user: { id: "1" }, onboardingRequired: false }));
    await authApi.refresh();
    expect(fetch).toHaveBeenCalledWith(`${API}/auth/refresh`, expect.objectContaining({ method: "POST", body: undefined, credentials: "include", headers: expect.objectContaining({ "X-CSRF-Token": "csrf-1" }) }));
    expect(authStorage.getCsrfToken()).toBe("csrf-2");

    vi.mocked(fetch).mockResolvedValueOnce(json({ code: "INVALID_REFRESH_TOKEN", message: "Sessão inválida." }, 401));
    await expect(authApi.refresh()).rejects.toMatchObject({ status: 401 });
    expect(authStorage.getAccessToken()).toBeNull();
  });

  it("clears local credentials on logout even when the API is unreachable", async () => {
    authStorage.setCredentials({ accessToken: "a1", refreshToken: "r1" });
    authStorage.setCsrfToken("csrf-logout");
    vi.mocked(fetch).mockRejectedValue(new TypeError("network down"));
    await expect(authApi.logout()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(`${API}/auth/logout`, expect.objectContaining({ method: "POST", body: undefined, credentials: "include", headers: expect.objectContaining({ "X-CSRF-Token": "csrf-logout" }) }));
    expect(authStorage.getAccessToken()).toBeNull();
  });

  it("skips the logout call when nothing is stored", async () => {
    await authApi.logout();
    expect(fetch).not.toHaveBeenCalled();
  });
});
