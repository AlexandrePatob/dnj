import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where, type Firestore } from "firebase/firestore";
import { CALLED_PEOPLE_PATH, DEFAULT_QUEUE_CONFIG, QUEUE_CONFIG_PATH, QUEUE_ENTRIES_PATH, firebaseQueueType, pastoralQueueType, type PastoralQueueType, type QueueEntry } from "./types";

export interface ParticipantIdentity { id: string; name: string; }

export class ParticipantQueueError extends Error {
  constructor(message: string, public readonly code: "queue_closed" | "already_active" | "already_completed" | "not_active" | "unavailable") {
    super(message);
    this.name = "ParticipantQueueError";
  }
}

const entryRef = (db: Firestore, entryId: string) => doc(db, QUEUE_ENTRIES_PATH, entryId);
const configRef = (db: Firestore) => doc(db, QUEUE_CONFIG_PATH);
const entriesFor = (db: Firestore, phone: string) => query(collection(db, QUEUE_ENTRIES_PATH), where("phone", "==", phone));
const calledFor = (db: Firestore, phone: string) => query(collection(db, CALLED_PEOPLE_PATH), where("phone", "==", phone));
const queueEntryId = (name: string, type: PastoralQueueType) => `${name.trim().replaceAll("/", "-") || "Participante"}_${type}`;

export async function getActiveQueue(db: Firestore, participantId: string): Promise<QueueEntry | null> {
  const [queueSnapshot, calledSnapshot] = await Promise.all([getDocs(entriesFor(db, participantId)), getDocs(calledFor(db, participantId))]);
  const queued = queueSnapshot.docs[0];
  const queuedType = queued && pastoralQueueType(queued.data().queueType);
  if (queued && queuedType) return { id: queued.id, participantId, participantName: queued.data().name, type: queuedType, status: "queued", createdAt: queued.data().createdAt, notificationMilestones: {} };

  const called = calledSnapshot.docs.find((entry) => entry.data().status === "called" && pastoralQueueType(entry.data().queueType));
  const calledType = called && pastoralQueueType(called.data().queueType);
  return called && calledType ? { id: called.id, participantId, participantName: called.data().name, type: calledType, status: "called", createdAt: called.data().createdAt, calledAt: called.data().calledAt, notificationMilestones: {} } : null;
}

export async function getQueueEligibility(db: Firestore, participantId: string, type: PastoralQueueType) {
  const [queueSnapshot, calledSnapshot] = await Promise.all([getDocs(entriesFor(db, participantId)), getDocs(calledFor(db, participantId))]);
  const active = queueSnapshot.docs[0];
  const completed = calledSnapshot.docs.some((entry) => entry.data().status === "confirmed" && pastoralQueueType(entry.data().queueType) === type);
  return { canJoin: !active && !completed, activeEntryId: active?.id, completed };
}

export async function joinQueue(db: Firestore, identity: ParticipantIdentity, type: PastoralQueueType, options: { entryId?: string } = {}): Promise<QueueEntry> {
  const id = options.entryId ?? queueEntryId(identity.name, type);
  const [existingEntries, calledEntries] = await Promise.all([getDocs(entriesFor(db, identity.id)), getDocs(calledFor(db, identity.id))]);
  if (!existingEntries.empty) {
    const existing = existingEntries.docs[0];
    if (pastoralQueueType(existing.data().queueType) === type) return { id: existing.id, participantId: identity.id, participantName: existing.data().name, type, status: "queued", createdAt: existing.data().createdAt, notificationMilestones: {} };
    throw new ParticipantQueueError("O participante já está em uma fila.", "already_active");
  }
  if (calledEntries.docs.some((entry) => entry.data().status === "confirmed" && pastoralQueueType(entry.data().queueType) === type)) throw new ParticipantQueueError("Este atendimento já foi concluído nesta edição.", "already_completed");
  return runTransaction(db, async (transaction) => {
    const configSnapshot = await transaction.get(configRef(db));
    const config = configSnapshot.exists() ? configSnapshot.data() : DEFAULT_QUEUE_CONFIG;
    if (config.isQueueOpen !== true) throw new ParticipantQueueError("A fila está fechada.", "queue_closed");
    const createdAt = serverTimestamp() as QueueEntry["createdAt"];
    transaction.set(entryRef(db, id), { phone: identity.id, name: identity.name, queueType: firebaseQueueType(type), createdAt });
    return { id, participantId: identity.id, participantName: identity.name, type, status: "queued", createdAt, notificationMilestones: {} };
  });
}

export async function leaveQueue(db: Firestore, participantId: string): Promise<void> {
  const [entries, calledEntries] = await Promise.all([getDocs(entriesFor(db, participantId)), getDocs(calledFor(db, participantId))]);
  await runTransaction(db, async (transaction) => {
    entries.docs.forEach((entry) => transaction.delete(entry.ref));
    calledEntries.docs.filter((entry) => entry.data().status === "called").forEach((entry) => transaction.delete(entry.ref));
  });
}
