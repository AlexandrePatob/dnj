"use client";

import { useMemo, useSyncExternalStore } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  changedAt: number;
}

const SERVER_SNAPSHOT: NetworkStatus = { isOnline: true, changedAt: 0 };

function getServerSnapshot(): NetworkStatus {
  return SERVER_SNAPSHOT;
}

function createNetworkStore() {
  let snapshot = SERVER_SNAPSHOT;

  const subscribe = (notify: () => void) => {
    const update = (isOnline: boolean) => {
      snapshot = { isOnline, changedAt: Date.now() };
      notify();
    };
    const updateOnline = () => {
      update(true);
    };
    const updateOffline = () => {
      update(false);
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);
    if (snapshot.isOnline !== navigator.onLine) update(navigator.onLine);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
    };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const store = useMemo(() => createNetworkStore(), []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
}
