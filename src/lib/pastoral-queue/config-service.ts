import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { pastoralFirestore } from "./firebase";
import { DEFAULT_QUEUE_CONFIG, isQueueConfig, QUEUE_CONFIG_PATH, type QueueConfig } from "./types";

function configRef() {
  if (!pastoralFirestore) throw new Error("Firestore pastoral indisponível.");
  return doc(pastoralFirestore, ...QUEUE_CONFIG_PATH.split("/"));
}

export async function getQueueConfig(): Promise<QueueConfig> {
  const snapshot = await getDoc(configRef());
  const value = snapshot.exists() ? snapshot.data() : undefined;
  return isQueueConfig(value) ? value : DEFAULT_QUEUE_CONFIG;
}

export function subscribeToQueueConfig(onChange: (config: QueueConfig) => void, onError?: (error: Error) => void): Unsubscribe {
  try {
    return onSnapshot(configRef(), (snapshot) => {
      const value = snapshot.exists() ? snapshot.data() : undefined;
      onChange(isQueueConfig(value) ? value : DEFAULT_QUEUE_CONFIG);
    }, (error) => onError?.(error));
  } catch (error) {
    onError?.(error as Error);
    return () => undefined;
  }
}

export async function updateQueueConfig(patch: Partial<QueueConfig>): Promise<QueueConfig> {
  const current = await getQueueConfig();
  const next = { ...current, ...patch };
  if (!isQueueConfig(next)) throw new Error("Configuração da fila inválida.");
  await setDoc(configRef(), next, { merge: true });
  return next;
}
