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

  it("stores the token pair after verifying an e-mail code", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "a1", refreshToken: "r1", tokenType: "Bearer", expiresIn: 900, refreshExpiresIn: 2592000, user: { id: "1", role: "DEFAULT" }, onboardingRequired: true }));
    await authApi.verifyCode("ana@example.com", "123456");
    expect(authStorage.getAccessToken()).toBe("a1");
    expect(authStorage.getRefreshToken()).toBe("r1");
  });

  it("rotates the pair on refresh and clears it when the refresh is refused", async () => {
    authStorage.setCredentials({ accessToken: "a1", refreshToken: "r1" });
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "a2", refreshToken: "r2", tokenType: "Bearer", expiresIn: 900, refreshExpiresIn: 2592000, user: { id: "1" }, onboardingRequired: false }));
    await authApi.refresh();
    expect(fetch).toHaveBeenCalledWith(`${API}/auth/refresh`, expect.objectContaining({ method: "POST", body: JSON.stringify({ refreshToken: "r1" }) }));
    expect(authStorage.getRefreshToken()).toBe("r2");

    vi.mocked(fetch).mockResolvedValueOnce(json({ code: "INVALID_REFRESH_TOKEN", message: "Sessão inválida." }, 401));
    await expect(authApi.refresh()).rejects.toMatchObject({ status: 401 });
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
  });

  it("clears local credentials on logout even when the API is unreachable", async () => {
    authStorage.setCredentials({ accessToken: "a1", refreshToken: "r1" });
    vi.mocked(fetch).mockRejectedValue(new TypeError("network down"));
    await expect(authApi.logout()).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(`${API}/auth/logout`, expect.objectContaining({ method: "POST", body: JSON.stringify({ refreshToken: "r1" }) }));
    expect(authStorage.getAccessToken()).toBeNull();
    expect(authStorage.getRefreshToken()).toBeNull();
  });

  it("skips the logout call when nothing is stored", async () => {
    await authApi.logout();
    expect(fetch).not.toHaveBeenCalled();
  });
});
