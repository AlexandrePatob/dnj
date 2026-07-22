import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOfflineSnapshot,
  migrateThemeStorage,
  OFFLINE_SNAPSHOT_KEY,
  readOfflineSnapshot,
  THEME_KEY,
  writeOfflineSnapshot,
} from "./offline-snapshot";

const snapshot = {
  schemaVersion: 1 as const,
  capturedAt: "2026-07-22T15:00:00.000Z",
  lastMainScreen: "home" as const,
  user: { name: "Jovem DNJ", group: "Grupo São José", points: 120, rankPosition: 4 },
};

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe("offline snapshot", () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });
  });

  it("writes and reads the approved versioned public fields", () => {
    writeOfflineSnapshot(snapshot);
    expect(readOfflineSnapshot()).toEqual(snapshot);
  });

  it("rejects credentials and personal identifiers at any depth", () => {
    writeOfflineSnapshot({ ...snapshot, user: { ...snapshot.user, token: "secret" } } as never);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects headers and raw API response payloads", () => {
    writeOfflineSnapshot({ ...snapshot, headers: { Authorization: "secret" }, response: {} } as never);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("removes corrupted JSON instead of crashing", () => {
    storage.values.set(OFFLINE_SNAPSHOT_KEY, "{broken");
    expect(readOfflineSnapshot()).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(OFFLINE_SNAPSHOT_KEY);
  });

  it("removes a snapshot from a future schema", () => {
    storage.values.set(OFFLINE_SNAPSHOT_KEY, JSON.stringify({ ...snapshot, schemaVersion: 2 }));
    expect(readOfflineSnapshot()).toBeNull();
    expect(storage.values.has(OFFLINE_SNAPSHOT_KEY)).toBe(false);
  });

  it("rejects invalid timestamp, screen, and public field types", () => {
    storage.values.set(OFFLINE_SNAPSHOT_KEY, JSON.stringify({
      ...snapshot,
      capturedAt: "yesterday",
      lastMainScreen: "login",
      user: { ...snapshot.user, points: "120" },
    }));
    expect(readOfflineSnapshot()).toBeNull();
  });

  it("is safe during server-side rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(readOfflineSnapshot()).toBeNull();
    expect(() => writeOfflineSnapshot(snapshot)).not.toThrow();
  });

  it("handles unavailable storage without crashing", () => {
    storage.getItem.mockImplementation(() => { throw new Error("denied"); });
    expect(readOfflineSnapshot()).toBeNull();
  });

  it("preserves an earlier value when quota prevents a new write", () => {
    const previous = JSON.stringify(snapshot);
    storage.values.set(OFFLINE_SNAPSHOT_KEY, previous);
    storage.setItem.mockImplementation(() => { throw new Error("quota"); });
    expect(() => writeOfflineSnapshot({ ...snapshot, lastMainScreen: "game" })).not.toThrow();
    expect(storage.values.get(OFFLINE_SNAPSHOT_KEY)).toBe(previous);
  });

  it("clears the snapshot idempotently for logout", () => {
    storage.values.set(OFFLINE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    clearOfflineSnapshot();
    clearOfflineSnapshot();
    expect(storage.values.has(OFFLINE_SNAPSHOT_KEY)).toBe(false);
  });

  it("migrates the legacy raw theme into the canonical key", () => {
    storage.values.set("dnj_theme", "dark");
    expect(migrateThemeStorage()).toBe("dark");
    expect(storage.values.get(THEME_KEY)).toBe(JSON.stringify("dark"));
    expect(storage.values.has("dnj_theme")).toBe(false);
  });

  it("keeps the canonical theme when both keys exist", () => {
    storage.values.set(THEME_KEY, JSON.stringify("light"));
    storage.values.set("dnj_theme", "dark");
    expect(migrateThemeStorage()).toBe("light");
    expect(storage.values.get(THEME_KEY)).toBe(JSON.stringify("light"));
  });
});
