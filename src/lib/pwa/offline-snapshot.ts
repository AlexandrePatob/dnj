export const OFFLINE_SNAPSHOT_KEY = "dnj.pwa.snapshot.v1";
export const THEME_KEY = "dnj.theme.v1";
const LEGACY_THEME_KEY = "dnj_theme";

const MAIN_SCREENS = new Set(["home", "game", "queue", "gallery", "account"] as const);
const FORBIDDEN_KEYS = new Set(["authorization", "body", "cpf", "email", "header", "headers", "response", "token"]);

export interface OfflineSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  lastMainScreen: "home" | "game" | "queue" | "gallery" | "account";
  user: {
    name: string;
    group: string;
    points: number;
    rankPosition: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_KEYS.has(key.toLowerCase()) || hasForbiddenKey(nested),
  );
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function isOfflineSnapshot(value: unknown): value is OfflineSnapshot {
  if (!isRecord(value) || hasForbiddenKey(value)) return false;
  if (!hasExactKeys(value, ["schemaVersion", "capturedAt", "lastMainScreen", "user"])) return false;
  if (
    value.schemaVersion !== 1 ||
    typeof value.capturedAt !== "string" ||
    Number.isNaN(Date.parse(value.capturedAt)) ||
    typeof value.lastMainScreen !== "string" ||
    !MAIN_SCREENS.has(value.lastMainScreen as OfflineSnapshot["lastMainScreen"]) ||
    !isRecord(value.user) ||
    !hasExactKeys(value.user, ["name", "group", "points", "rankPosition"])
  ) {
    return false;
  }
  return (
    typeof value.user.name === "string" &&
    typeof value.user.group === "string" &&
    typeof value.user.points === "number" &&
    Number.isFinite(value.user.points) &&
    typeof value.user.rankPosition === "number" &&
    Number.isFinite(value.user.rankPosition)
  );
}

function localStorageOrNull(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOfflineSnapshot(): OfflineSnapshot | null {
  const storage = localStorageOrNull();
  if (!storage) return null;
  try {
    const raw = storage.getItem(OFFLINE_SNAPSHOT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (isOfflineSnapshot(value)) return value;
    storage.removeItem(OFFLINE_SNAPSHOT_KEY);
    return null;
  } catch {
    try {
      storage.removeItem(OFFLINE_SNAPSHOT_KEY);
    } catch {
      // Storage may be unavailable entirely.
    }
    return null;
  }
}

export function writeOfflineSnapshot(snapshot: OfflineSnapshot): void {
  if (!isOfflineSnapshot(snapshot)) return;
  const storage = localStorageOrNull();
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Preserve an earlier valid snapshot when the new write cannot be persisted.
  }
}

export function clearOfflineSnapshot(): void {
  const storage = localStorageOrNull();
  if (!storage) return;
  try {
    storage.removeItem(OFFLINE_SNAPSHOT_KEY);
  } catch {
    // Logout remains safe even when storage is unavailable.
  }
}

function parseTheme(value: string | null): "light" | "dark" | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed === "light" || parsed === "dark" ? parsed : null;
  } catch {
    return value === "light" || value === "dark" ? value : null;
  }
}

export function migrateThemeStorage(): "light" | "dark" | null {
  const storage = localStorageOrNull();
  if (!storage) return null;
  try {
    const canonical = parseTheme(storage.getItem(THEME_KEY));
    if (canonical) return canonical;
    const legacy = parseTheme(storage.getItem(LEGACY_THEME_KEY));
    if (!legacy) return null;
    storage.setItem(THEME_KEY, JSON.stringify(legacy));
    storage.removeItem(LEGACY_THEME_KEY);
    return legacy;
  } catch {
    return null;
  }
}
