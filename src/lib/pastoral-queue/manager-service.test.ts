/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from "vitest";
import { callNext, resolveCalled } from "./manager-service";

const fb = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, ...parts: string[]) => parts.join("/")),
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => n),
  orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  query: vi.fn((...args: unknown[]) => args.join("|")),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  where: vi.fn((...args: unknown[]) => args.join("=")),
}));
vi.mock("firebase/firestore", () => fb);
const manager = { id: "m1", name: "Geovane" };

function dbWith(queueSnapshot: unknown, documentSnapshot: any = { exists: () => true, data: () => ({ phone: "+5511999", name: "Ana", queueType: "confissoes", createdAt: "EARLY" }) }) {
  const writes: { op: string; value?: unknown }[] = [];
  fb.getDocs.mockResolvedValue(queueSnapshot);
  fb.runTransaction.mockImplementation(async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => callback({
    get: vi.fn(async () => documentSnapshot),
    delete: () => writes.push({ op: "delete" }),
    set: (_ref: unknown, value: unknown) => writes.push({ op: "set", value }),
    update: (_ref: unknown, value: unknown) => writes.push({ op: "update", value }),
  }));
  return { writes } as any;
}

describe("manager queue transitions", () => {
  it("moves the first legacy queue entry to calledPeople", async () => {
    const db = dbWith({ empty: false, docs: [{ id: "e1", ref: "queue/e1" }] });
    await expect(callNext(db, "confession", manager)).resolves.toMatchObject({ id: "e1", status: "called", participantName: "Ana" });
    expect(db.writes).toEqual(expect.arrayContaining([{ op: "delete" }, expect.objectContaining({ op: "set", value: expect.objectContaining({ status: "called" }) })]));
  });

  it("reports empty queues and closes a called person using legacy statuses", async () => {
    await expect(callNext(dbWith({ empty: true, docs: [] }), "spiritual", manager)).rejects.toMatchObject({ code: "empty" });
    const db = dbWith({ empty: true, docs: [] }, { exists: () => true, data: () => ({ status: "called", queueType: "confissoes" }) });
    await resolveCalled(db, "e1", "completed", manager);
    expect(db.writes).toEqual([expect.objectContaining({ op: "update", value: expect.objectContaining({ status: "confirmed" }) })]);
  });
});
