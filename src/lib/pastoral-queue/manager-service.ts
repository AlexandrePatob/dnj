/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, where, type Firestore } from "firebase/firestore";
import { CALLED_PEOPLE_PATH, QUEUE_ENTRIES_PATH, firebaseQueueType, pastoralQueueType, type PastoralQueueType, type QueueEntry } from "./types";

export interface ManagerIdentity { id: string; name: string }
export class ManagerQueueError extends Error {
  constructor(message: string, public readonly code: "empty" | "conflict") { super(message); this.name = "ManagerQueueError"; }
}

export async function callNext(db: Firestore, type: PastoralQueueType, manager: ManagerIdentity): Promise<QueueEntry> {
  const entries = query(collection(db, QUEUE_ENTRIES_PATH), where("queueType", "==", firebaseQueueType(type)), orderBy("createdAt", "asc"), limit(1));
  const next = await getDocs(entries);
  if (next.empty) throw new ManagerQueueError("Não há pessoas aguardando.", "empty");
  const first = next.docs[0];

  return runTransaction(db, async (transaction: any) => {
    const snapshot = await transaction.get(first.ref);
    if (!snapshot.exists()) throw new ManagerQueueError("Esta chamada já foi processada.", "conflict");
    const raw = snapshot.data();
    const calledAt = serverTimestamp();
    transaction.delete(first.ref);
    transaction.set(doc(db, CALLED_PEOPLE_PATH, first.id), { ...raw, status: "called", calledAt, updatedAt: calledAt, expiresAt: new Date(Date.now() + 120_000), resolvedBy: manager });
    return { id: first.id, participantId: raw.phone, participantName: raw.name, type, status: "called", createdAt: raw.createdAt, calledAt: calledAt as QueueEntry["calledAt"], notificationMilestones: {} };
  });
}

export async function resolveCalled(db: Firestore, entryId: string, outcome: "completed" | "no_show", manager: ManagerIdentity): Promise<void> {
  await runTransaction(db, async (transaction: any) => {
    const ref = doc(db, CALLED_PEOPLE_PATH, entryId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().status !== "called") throw new ManagerQueueError("Esta chamada já foi encerrada.", "conflict");
    const entry = snapshot.data();
    if (!pastoralQueueType(entry.queueType)) throw new ManagerQueueError("Tipo de fila inválido.", "conflict");
    transaction.update(ref, { status: outcome === "completed" ? "confirmed" : "no-show", updatedAt: serverTimestamp(), resolvedBy: manager });
  });
}
