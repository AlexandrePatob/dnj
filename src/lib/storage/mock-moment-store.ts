import type { Moment } from "@/types/experience";

const databaseName = "dnj-mock-experience-v1";
const storeName = "moments";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMockMoment(moment: Moment): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(moment);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function readMockMoments(): Promise<Moment[]> {
  if (typeof indexedDB === "undefined") return [];
  const database = await openDatabase();
  const moments = await new Promise<Moment[]>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as Moment[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return moments;
}
