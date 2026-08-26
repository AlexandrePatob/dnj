import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { pastoralFirestore } from "./firebase";
import {
  NOTIFICATION_INTENTS_PATH,
  QUEUE_ENTRIES_PATH,
  notificationIntentId,
  type NotificationIntent,
  type NotificationMilestone,
  type PastoralQueueType,
  type QueueEntry,
} from "./types";

export interface QueueSnapshot {
  type: PastoralQueueType;
  queued: QueueEntry[];
  called: QueueEntry | null;
  totalWaiting: number;
}

function requireFirestore() {
  if (!pastoralFirestore) throw new Error("Firestore pastoral indisponível neste ambiente.");
  return pastoralFirestore;
}

function toEntry(data: DocumentData, id: string): QueueEntry {
  return { id, ...(data as Omit<QueueEntry, "id">), notificationMilestones: data.notificationMilestones ?? {} };
}

export function subscribeQueue(type: PastoralQueueType | null, onChange: (snapshot: QueueSnapshot) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!type) throw new Error("Tipo de fila inválido.");
  const db = requireFirestore();
  const q = query(collection(db, QUEUE_ENTRIES_PATH), where("type", "==", type), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((item) => toEntry(item.data(), item.id));
    const called = entries.find((entry) => entry.status === "called") ?? null;
    const queued = entries.filter((entry) => entry.status === "queued");
    onChange({ type, queued, called, totalWaiting: queued.length });
  }, (error) => onError?.(error));
}

export function subscribeParticipantEntry(entryId: string, onChange: (entry: QueueEntry | null) => void, onError?: (error: Error) => void): Unsubscribe {
  const db = requireFirestore();
  return onSnapshot(doc(db, QUEUE_ENTRIES_PATH, entryId), (snap) => onChange(snap.exists() ? toEntry(snap.data(), snap.id) : null), (error) => onError?.(error));
}

export async function createNotificationIntent(entryId: string, participantId: string, milestone: NotificationMilestone): Promise<void> {
  const db = requireFirestore();
  const intent = doc(db, NOTIFICATION_INTENTS_PATH, notificationIntentId(entryId, milestone));
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(intent);
    if (existing.exists()) return;
    transaction.set(intent, { id: intent.id, entryId, participantId, milestone, status: "pending", createdAt: new Date() } satisfies Omit<NotificationIntent, "createdAt"> & { createdAt: Date });
  });
}
