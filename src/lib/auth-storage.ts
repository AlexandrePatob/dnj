// Persists the bearer credentials issued by the external API. Keeping the
// refresh token in localStorage is a deliberate product decision; XSS
// hardening is therefore an operational requirement of this frontend.
const accessTokenKey = "dnj.auth.access-token.v1";
const refreshTokenKey = "dnj.auth.refresh-token.v1";
const csrfTokenKey = "dnj.auth.csrf-token.v1";

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
  getRefreshToken: () => read(refreshTokenKey, memory.refreshToken) || null,
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
    if (credentials.refreshToken) {
      memory.refreshToken = credentials.refreshToken;
      write(refreshTokenKey, credentials.refreshToken);
    }
  },
  clearCredentials: () => {
    memory = {};
    write(accessTokenKey, null);
    write(refreshTokenKey, null);
    write(csrfTokenKey, null);
  },
  hasSession: () => Boolean(authStorage.getAccessToken() || authStorage.getRefreshToken()),
};

export function isStoredCredentials(data: unknown): data is StoredCredentials {
  return Boolean(data) && typeof data === "object"
    && typeof (data as StoredCredentials).accessToken === "string" && (data as StoredCredentials).accessToken !== "";
}
