import {
  deleteField,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import {
  DEFAULT_QUEUE_CONFIG,
  PARTICIPANT_STATES_PATH,
  QUEUE_CONFIG_PATH,
  QUEUE_ENTRIES_PATH,
  type ParticipantQueueState,
  type PastoralQueueType,
  type QueueEntry,
} from "./types";

export interface ParticipantIdentity {
  id: string;
  name: string;
}

export class ParticipantQueueError extends Error {
  constructor(message: string, public readonly code: "queue_closed" | "already_active" | "already_completed" | "not_active" | "unavailable") {
    super(message);
    this.name = "ParticipantQueueError";
  }
}

const stateRef = (db: Firestore, participantId: string) => doc(db, PARTICIPANT_STATES_PATH, participantId);
const entryRef = (db: Firestore, entryId: string) => doc(db, QUEUE_ENTRIES_PATH, entryId);
const configRef = (db: Firestore) => doc(db, QUEUE_CONFIG_PATH);

export async function getQueueEligibility(db: Firestore, participantId: string, type: PastoralQueueType) {
  const stateSnapshot = await getDoc(stateRef(db, participantId));
  const state = stateSnapshot.exists() ? (stateSnapshot.data() as ParticipantQueueState) : { completedTypes: {} };
  return {
    canJoin: !state.activeEntryId && !state.completedTypes?.[type],
    activeEntryId: state.activeEntryId,
    completed: Boolean(state.completedTypes?.[type]),
  };
}

export async function joinQueue(
  db: Firestore,
  identity: ParticipantIdentity,
  type: PastoralQueueType,
  options: { entryId?: string } = {},
): Promise<QueueEntry> {
  const id = options.entryId ?? `${identity.id}_${type}`;
  return runTransaction(db, async (transaction) => {
    const participant = stateRef(db, identity.id);
    const stateSnapshot = await transaction.get(participant);
    const state = stateSnapshot.exists() ? (stateSnapshot.data() as ParticipantQueueState) : { completedTypes: {} };

    if (state.activeEntryId) {
      if (state.activeType === type) {
        const existing = await transaction.get(entryRef(db, state.activeEntryId));
        if (existing.exists()) return existing.data() as QueueEntry;
      }
      throw new ParticipantQueueError("O participante já está em uma fila.", "already_active");
    }
    if (state.completedTypes?.[type]) {
      throw new ParticipantQueueError("Este atendimento já foi concluído nesta edição.", "already_completed");
    }

    const configSnapshot = await transaction.get(configRef(db));
    const config = configSnapshot.exists() ? configSnapshot.data() : DEFAULT_QUEUE_CONFIG;
    if (config.isQueueOpen !== true) throw new ParticipantQueueError("A fila está fechada.", "queue_closed");

    const entry: QueueEntry = {
      id,
      participantId: identity.id,
      participantName: identity.name,
      type,
      status: "queued",
      createdAt: serverTimestamp() as QueueEntry["createdAt"],
      notificationMilestones: {},
    };
    transaction.set(entryRef(db, id), entry);
    transaction.set(participant, { activeEntryId: id, activeType: type, completedTypes: state.completedTypes ?? {} });
    return entry;
  });
}

export async function leaveQueue(db: Firestore, participantId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const participant = stateRef(db, participantId);
    const snapshot = await transaction.get(participant);
    if (!snapshot.exists()) return;
    const state = snapshot.data() as ParticipantQueueState;
    if (!state.activeEntryId) return;
    const entry = entryRef(db, state.activeEntryId);
    const entrySnapshot = await transaction.get(entry);
    if (entrySnapshot.exists() && (entrySnapshot.data() as QueueEntry).status === "queued") {
      transaction.update(entry, { status: "cancelled", resolvedAt: serverTimestamp() });
    }
    transaction.set(participant, { activeEntryId: deleteField(), activeType: deleteField(), completedTypes: state.completedTypes ?? {} }, { merge: true });
  });
}
