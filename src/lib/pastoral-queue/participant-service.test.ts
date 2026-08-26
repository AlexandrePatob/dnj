import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinQueue, leaveQueue, ParticipantQueueError } from "./participant-service";

const firestore = vi.hoisted(() => ({
  deleteField: vi.fn(() => "DELETE"),
  doc: vi.fn((_db: unknown, ...parts: string[]) => parts.join("/")),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  runTransaction: vi.fn(async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => callback((globalThis as { tx?: unknown }).tx)),
}));
vi.mock("firebase/firestore", () => firestore);

function fakeDb(reads: Record<string, { exists: () => boolean; data: () => unknown }>) {
  const writes: { op: string; path: string; value?: unknown }[] = [];
  const db = {
    writes,
  };
  (globalThis as { tx?: unknown }).tx = {
    get: async (path: string) => reads[path] ?? { exists: () => false, data: () => undefined },
    set: (path: string, value: unknown) => writes.push({ op: "set", path, value }),
    update: (path: string, value: unknown) => writes.push({ op: "update", path, value }),
  };
  return db as { writes: { op: string; path: string; value?: unknown }[] };
}

describe("participant queue transactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a second active queue and a completed service type", async () => {
    const activeDb = fakeDb({
      "pastoral_queue/current/participants/u1": { exists: () => true, data: () => ({ activeEntryId: "e1", activeType: "confession", completedTypes: {} }) },
    });
    await expect(joinQueue(activeDb, { id: "u1", name: "Alexandre" }, "spiritual")).rejects.toMatchObject({ code: "already_active" });
    const completedDb = fakeDb({
      "pastoral_queue/current/participants/u1": { exists: () => true, data: () => ({ completedTypes: { confession: "DONE" } }) },
    });
    await expect(joinQueue(completedDb, { id: "u1", name: "Alexandre" }, "confession")).rejects.toMatchObject({ code: "already_completed" });
  });

  it("blocks a closed queue without writing an entry", async () => {
    const db = fakeDb({
      "pastoral_queue/current/config/default": { exists: () => true, data: () => ({ isQueueOpen: false, pushEnabled: true, notificationDelaySeconds: 0 }) },
    });
    await expect(joinQueue(db, { id: "u1", name: "Alexandre" }, "confession")).rejects.toMatchObject({ code: "queue_closed" });
    expect(db.writes).toHaveLength(0);
  });

  it("leaves only the active entry and preserves completed types", async () => {
    const db = fakeDb({
      "pastoral_queue/current/participants/u1": { exists: () => true, data: () => ({ activeEntryId: "e1", activeType: "confession", completedTypes: { spiritual: "DONE" } }) },
      "pastoral_queue/current/entries/e1": { exists: () => true, data: () => ({ status: "queued" }) },
    });
    await leaveQueue(db, "u1");
    expect(db.writes[0]).toMatchObject({ op: "update", value: { status: "cancelled" } });
    expect(db.writes[1]).toMatchObject({ value: { activeEntryId: "DELETE", activeType: "DELETE", completedTypes: { spiritual: "DONE" } } });
  });

  it("returns the existing active entry when the same join is retried", async () => {
    const existing = { id: "e1", participantId: "u1", participantName: "Alexandre", type: "confession", status: "queued" };
    const db = fakeDb({
      "pastoral_queue/current/participants/u1": { exists: () => true, data: () => ({ activeEntryId: "e1", activeType: "confession", completedTypes: {} }) },
      "pastoral_queue/current/entries/e1": { exists: () => true, data: () => existing },
    });
    await expect(joinQueue(db, { id: "u1", name: "Alexandre" }, "confession")).resolves.toEqual(existing);
    expect(db.writes).toHaveLength(0);
  });
});
