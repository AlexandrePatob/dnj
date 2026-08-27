/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { joinQueue, leaveQueue } from "./participant-service";

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, ...parts: string[]) => parts.join("/")),
  getDocs: vi.fn(),
  query: vi.fn((...parts: unknown[]) => parts.join("|")),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  where: vi.fn((...parts: unknown[]) => parts.join("=")),
  runTransaction: vi.fn(async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => callback((globalThis as { tx?: unknown }).tx)),
}));
vi.mock("firebase/firestore", () => firestore);

const empty = { empty: true, docs: [] };
const item = (id: string, data: Record<string, unknown>) => ({ id, ref: `queue/${id}`, data: () => data });
function fakeDb(reads: { queue?: unknown; called?: unknown; config?: unknown }) {
  const writes: { op: string; path?: string; value?: unknown }[] = [];
  firestore.getDocs.mockReset().mockResolvedValueOnce(reads.queue ?? empty).mockResolvedValueOnce(reads.called ?? empty);
  (globalThis as { tx?: unknown }).tx = {
    get: async () => reads.config ?? { exists: () => false },
    set: (ref: unknown, value: unknown) => writes.push({ op: "set", path: String(ref), value }),
    delete: (_ref: unknown) => writes.push({ op: "delete" }),
  };
  return { writes } as any;
}

describe("participant queue transactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks an active queue and a confirmed service type", async () => {
    const active = fakeDb({ queue: { empty: false, docs: [item("e1", { queueType: "confissoes", name: "Alexandre" })] } });
    await expect(joinQueue(active, { id: "u1", name: "Alexandre" }, "spiritual")).rejects.toMatchObject({ code: "already_active" });
    const completed = fakeDb({ called: { empty: false, docs: [item("c1", { queueType: "confissoes", status: "confirmed" })] } });
    await expect(joinQueue(completed, { id: "u1", name: "Alexandre" }, "confession")).rejects.toMatchObject({ code: "already_completed" });
  });

  it("blocks a closed queue without writing an entry", async () => {
    const db = fakeDb({ config: { exists: () => true, data: () => ({ isQueueOpen: false }) } });
    await expect(joinQueue(db, { id: "u1", name: "Alexandre" }, "confession")).rejects.toMatchObject({ code: "queue_closed" });
    expect(db.writes).toHaveLength(0);
  });

  it("removes the legacy queue document when the participant leaves", async () => {
    const db = fakeDb({ queue: { empty: false, docs: [item("e1", { queueType: "confissoes" })] } });
    await leaveQueue(db, "u1");
    expect(db.writes).toEqual([{ op: "delete" }]);
  });

  it("returns the existing entry when joining the same queue again", async () => {
    const db = fakeDb({ queue: { empty: false, docs: [item("e1", { queueType: "confissoes", name: "Alexandre", createdAt: "EARLY" })] } });
    await expect(joinQueue(db, { id: "u1", name: "Alexandre" }, "confession")).resolves.toMatchObject({ id: "e1", status: "queued" });
    expect(db.writes).toHaveLength(0);
  });

  it("uses the participant name in new legacy document IDs", async () => {
    const db = fakeDb({ config: { exists: () => true, data: () => ({ isQueueOpen: true }) } });
    await joinQueue(db, { id: "+5511999990000", name: "Participante local" }, "spiritual");
    expect(db.writes[0]).toMatchObject({ path: "queue/Participante local_spiritual" });
  });
});
