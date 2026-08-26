import { describe, expect, it, vi } from "vitest";
import { callNext, ManagerQueueError, resolveCalled } from "./manager-service";
const fb = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, path: string) => path), doc: vi.fn((_db: unknown, ...parts: string[]) => parts.join("/")),
  limit: vi.fn((n: number) => n), orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  query: vi.fn((...args: unknown[]) => args.join("|")), runTransaction: vi.fn(), serverTimestamp: vi.fn(() => "SERVER_TIME"), where: vi.fn((...args: unknown[]) => args.join("=")),
}));
vi.mock("firebase/firestore", () => fb);
const manager = { id: "m1", name: "Geonvne" };
function dbWith(snapshot: unknown, participant?: unknown) {
  const writes: unknown[] = [];
  fb.runTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => callback({ get: vi.fn(async (ref: unknown) => String(ref).includes("participants") ? participant ?? { exists: () => false } : snapshot), update: (_r: unknown, value: unknown) => writes.push(value), set: (_r: unknown, value: unknown) => writes.push(value) }));
  return { writes } as any;
}
describe("manager queue transitions", () => {
  it("calls the earliest queued entry and removes it from queued state", async () => {
    const entry = { id: "e1", participantId: "u1", type: "confession", status: "queued", createdAt: "EARLY" };
    const db = dbWith({ empty: false, docs: [{ id: "e1", data: () => entry }] });
    await expect(callNext(db, "confession", manager)).resolves.toMatchObject({ id: "e1", status: "called", resolvedBy: manager });
    expect(db.writes[0]).toMatchObject({ status: "called" });
  });
  it("reports empty queues and rejects resolving terminal entries", async () => {
    await expect(callNext(dbWith({ empty: true, docs: [] }), "spiritual", manager)).rejects.toMatchObject({ code: "empty" });
    const db = dbWith({ exists: () => true, data: () => ({ status: "completed" }) });
    await expect(resolveCalled(db, "e1", "completed", manager)).rejects.toMatchObject({ code: "conflict" });
  });
  it("completes only the matching type and releases no-show participants", async () => {
    const called = { exists: () => true, data: () => ({ participantId: "u1", type: "confession", status: "called" }) };
    const db = dbWith(called, { exists: () => true, data: () => ({ activeEntryId: "e1", activeType: "confession", completedTypes: { spiritual: "DONE" } }) });
    await resolveCalled(db, "e1", "completed", manager);
    expect(db.writes[0]).toMatchObject({ status: "completed" });
    expect(db.writes[1]).toMatchObject({ completedTypes: { spiritual: "DONE", confession: "SERVER_TIME" } });
    const noShowDb = dbWith(called, { exists: () => true, data: () => ({ activeEntryId: "e1", activeType: "confession", completedTypes: {} }) });
    await resolveCalled(noShowDb, "e1", "no_show", manager);
    expect(noShowDb.writes[1]).toMatchObject({ completedTypes: {} });
  });
});
