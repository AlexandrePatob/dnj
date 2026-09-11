import { afterEach, describe, expect, it, vi } from "vitest";

import { authStorage, isStoredCredentials } from "./auth-storage";

describe("authStorage", () => {
  afterEach(() => { authStorage.clearCredentials(); vi.unstubAllGlobals(); });

  it("persists only browser-readable credentials and clears legacy refresh storage", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    authStorage.setCredentials({ accessToken: "a", refreshToken: "r" });
    authStorage.setCsrfToken("csrf");
    expect(store.get("dnj.auth.access-token.v1")).toBe("a");
    expect(store.get("dnj.auth.refresh-token.v1")).toBeUndefined();
    expect(authStorage.getAccessToken()).toBe("a");
    expect(authStorage.getCsrfToken()).toBe("csrf");
    authStorage.clearCredentials();
    expect(store.size).toBe(0);
    expect(authStorage.getCsrfToken()).toBeNull();
  });

  it("falls back to memory when localStorage throws", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } });
    authStorage.setCredentials({ accessToken: "a", refreshToken: "r" });
    expect(authStorage.getAccessToken()).toBe("a");
  });

  it("recognizes an access token even when refresh state is cookie-backed", () => {
    expect(isStoredCredentials({ accessToken: "a", refreshToken: "r" })).toBe(true);
    expect(isStoredCredentials({ accessToken: "a", refreshToken: "" })).toBe(true);
    expect(isStoredCredentials({ user: {} })).toBe(false);
    expect(isStoredCredentials(null)).toBe(false);
  });
});
