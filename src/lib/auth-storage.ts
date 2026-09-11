// Only browser-readable session state belongs here. Refresh tokens stay in
// the API's HttpOnly cookie and must never be persisted by the SPA.
const accessTokenKey = "dnj.auth.access-token.v1";
const legacyRefreshTokenKey = "dnj.auth.refresh-token.v1";
const csrfTokenKey = "dnj.auth.csrf-token.v1";

// refreshToken is accepted only to make callers from pre-cookie builds safe;
// it is intentionally ignored and never persisted.
export type StoredCredentials = { accessToken: string; refreshToken?: string };

let memory: Partial<StoredCredentials> & { csrfToken?: string } = {};

function store(): Storage | null {
  try {
    const candidate = (globalThis as { localStorage?: Storage }).localStorage;
    return candidate && typeof candidate.getItem === "function" ? candidate : null;
  } catch {
    return null;
  }
}

function read(key: string, fallback?: string) {
  try {
    return store()?.getItem(key) ?? fallback ?? null;
  } catch {
    return fallback ?? null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) store()?.removeItem(key);
    else store()?.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode, quota); memory keeps the session alive for this tab.
  }
}

export const authStorage = {
  getAccessToken: () => read(accessTokenKey, memory.accessToken) || null,
  getRefreshToken: () => null,
  getCsrfToken: () => read(csrfTokenKey, memory.csrfToken) || null,
  setAccessToken: (accessToken: string) => {
    memory.accessToken = accessToken;
    write(accessTokenKey, accessToken);
  },
  setCsrfToken: (csrfToken: string) => {
    memory.csrfToken = csrfToken;
    write(csrfTokenKey, csrfToken);
  },
  setCredentials: (credentials: StoredCredentials) => {
    authStorage.setAccessToken(credentials.accessToken);
  },
  clearCredentials: () => {
    memory = {};
    write(accessTokenKey, null);
    // Clean up sessions created by earlier builds that stored the refresh token.
    write(legacyRefreshTokenKey, null);
    write(csrfTokenKey, null);
  },
  hasSession: () => Boolean(authStorage.getAccessToken()),
};

export function isStoredCredentials(data: unknown): data is StoredCredentials {
  return Boolean(data) && typeof data === "object"
    && typeof (data as StoredCredentials).accessToken === "string" && (data as StoredCredentials).accessToken !== "";
}
