import { collection, onSnapshot, orderBy, query, where, type DocumentData, type Unsubscribe } from "firebase/firestore";
import { pastoralFirestore } from "./firebase";
import { CALLED_PEOPLE_PATH, QUEUE_ENTRIES_PATH, firebaseQueueType, pastoralQueueType, type PastoralQueueType, type QueueEntry } from "./types";

export interface QueueSnapshot { type: PastoralQueueType; queued: QueueEntry[]; called: QueueEntry | null; calledEntries: QueueEntry[]; totalWaiting: number; }
export interface QueueHistoryStats { totalCalled: number; completed: number; noShows: number; }

function requireFirestore() {
  if (!pastoralFirestore) throw new Error("Firestore pastoral indisponível neste ambiente.");
  return pastoralFirestore;
}

function toEntry(data: DocumentData, id: string, status: QueueEntry["status"]): QueueEntry | null {
  const type = pastoralQueueType(data.queueType);
  return type ? { id, participantId: data.phone, participantName: data.name, type, status, createdAt: data.createdAt, calledAt: data.calledAt, notificationMilestones: {} } : null;
}

export function subscribeQueue(type: PastoralQueueType | null, onChange: (snapshot: QueueSnapshot) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!type) throw new Error("Tipo de fila inválido.");
  const db = requireFirestore();
  const legacyType = firebaseQueueType(type);
  let queued: QueueEntry[] = [];
  let called: QueueEntry | null = null;
  let calledEntries: QueueEntry[] = [];
  const emit = () => onChange({ type, queued, called, calledEntries, totalWaiting: queued.length });
  const unsubscribeQueue = onSnapshot(query(collection(db, QUEUE_ENTRIES_PATH), where("queueType", "==", legacyType), orderBy("createdAt", "asc")), (snap) => {
    queued = snap.docs.map((item) => toEntry(item.data(), item.id, "queued")).filter((entry): entry is QueueEntry => entry !== null);
    emit();
  }, (error) => onError?.(error));
  const unsubscribeCalled = onSnapshot(collection(db, CALLED_PEOPLE_PATH), (snap) => {
    calledEntries = snap.docs
      .filter((item) => item.data().status === "called" && pastoralQueueType(item.data().queueType) === type)
      .map((item) => toEntry(item.data(), item.id, "called"))
      .filter((entry): entry is QueueEntry => entry !== null)
      .sort((a, b) => timestamp(a.calledAt) - timestamp(b.calledAt));
    called = calledEntries[0] ?? null;
    emit();
  }, (error) => onError?.(error));
  return () => { unsubscribeQueue(); unsubscribeCalled(); };
}

function timestamp(value: QueueEntry["calledAt"]) {
  return value?.toMillis?.() ?? 0;
}

export function subscribeQueueHistory(type: PastoralQueueType, onChange: (stats: QueueHistoryStats) => void, onError?: (error: Error) => void): Unsubscribe {
  const db = requireFirestore();
  return onSnapshot(collection(db, CALLED_PEOPLE_PATH), (snap) => {
    const entries = snap.docs.filter((entry) => pastoralQueueType(entry.data().queueType) === type);
    onChange({
      totalCalled: entries.length,
      completed: entries.filter((entry) => entry.data().status === "confirmed").length,
      noShows: entries.filter((entry) => entry.data().status === "no-show").length,
    });
  }, (error) => onError?.(error));
}
