"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  changedAt: number;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useNetworkStatus(): NetworkStatus {
  const isOnlineRef = useRef(true);
  const changedAtRef = useRef(0);

  const subscribe = useCallback((notify: () => void) => {
    if (isOnlineRef.current !== navigator.onLine) {
      isOnlineRef.current = navigator.onLine;
      changedAtRef.current = Date.now();
    }
    const updateOnline = () => {
      isOnlineRef.current = true;
      changedAtRef.current = Date.now();
      notify();
    };
    const updateOffline = () => {
      isOnlineRef.current = false;
      changedAtRef.current = Date.now();
      notify();
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  const getSnapshot = useCallback(() => isOnlineRef.current, []);
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isOnline, changedAt: changedAtRef.current };
}
