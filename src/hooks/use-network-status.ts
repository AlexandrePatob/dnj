"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  changedAt: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    changedAt: 0,
  }));

  useEffect(() => {
    const update = () => setStatus({ isOnline: navigator.onLine, changedAt: Date.now() });
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return status;
}
