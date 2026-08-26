import { describe, expect, it, vi } from "vitest";
import { DEFAULT_QUEUE_CONFIG, QUEUE_CONFIG_PATH } from "./types";

const setDoc = vi.fn();
const getDoc = vi.fn();
vi.mock("firebase/firestore", () => ({ doc: vi.fn((_db, ...path) => path.join("/")), getDoc, setDoc, onSnapshot: vi.fn(), }));
vi.mock("./firebase", () => ({ pastoralFirestore: {} }));

describe("pastoral queue config service", () => {
  it("reads the global config and falls back to defaults", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    const { getQueueConfig } = await import("./config-service");
    await expect(getQueueConfig()).resolves.toEqual(DEFAULT_QUEUE_CONFIG);
  });
  it("rejects invalid delay and does not write it", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => DEFAULT_QUEUE_CONFIG });
    const { updateQueueConfig } = await import("./config-service");
    await expect(updateQueueConfig({ notificationDelaySeconds: 301 })).rejects.toThrow("inválida");
    expect(setDoc).not.toHaveBeenCalled();
    expect(QUEUE_CONFIG_PATH).toContain("config/default");
  });
});
