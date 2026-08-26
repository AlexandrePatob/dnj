import { collection, doc, limit, orderBy, query, runTransaction, serverTimestamp, where, type Firestore } from "firebase/firestore";
import { PARTICIPANT_STATES_PATH, QUEUE_ENTRIES_PATH, type PastoralQueueType, type QueueEntry, type ParticipantQueueState } from "./types";

export interface ManagerIdentity { id: string; name: string }
export class ManagerQueueError extends Error {
  constructor(message: string, public readonly code: "empty" | "conflict") { super(message); this.name = "ManagerQueueError"; }
}

export async function callNext(db: Firestore, type: PastoralQueueType, manager: ManagerIdentity): Promise<QueueEntry> {
  return runTransaction(db, async (transaction) => {
    const entries = query(collection(db, QUEUE_ENTRIES_PATH), where("type", "==", type), where("status", "==", "queued"), orderBy("createdAt", "asc"), limit(1));
    const snapshot = await transaction.get(entries);
    if (snapshot.empty) throw new ManagerQueueError("Não há pessoas aguardando.", "empty");
    const first = snapshot.docs[0];
    const entry = first.data() as QueueEntry;
    const ref = doc(db, QUEUE_ENTRIES_PATH, first.id);
    const called = { ...entry, status: "called" as const, calledAt: serverTimestamp(), resolvedBy: manager };
    transaction.update(ref, called);
    return called;
  });
}

export async function resolveCalled(db: Firestore, entryId: string, outcome: "completed" | "no_show", manager: ManagerIdentity): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, QUEUE_ENTRIES_PATH, entryId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || (snapshot.data() as QueueEntry).status !== "called") throw new ManagerQueueError("Esta chamada já foi encerrada.", "conflict");
    const entry = snapshot.data() as QueueEntry;
    const participantRef = doc(db, PARTICIPANT_STATES_PATH, entry.participantId);
    const participantSnapshot = await transaction.get(participantRef);
    const state = participantSnapshot.exists() ? participantSnapshot.data() as ParticipantQueueState : { completedTypes: {} };
    const nextState = outcome === "completed"
      ? { completedTypes: { ...state.completedTypes, [entry.type]: serverTimestamp() }, activeEntryId: undefined, activeType: undefined }
      : { completedTypes: state.completedTypes ?? {}, activeEntryId: undefined, activeType: undefined };
    transaction.update(ref, { status: outcome, resolvedAt: serverTimestamp(), resolvedBy: manager });
    transaction.set(participantRef, nextState, { merge: true });
  });
}
