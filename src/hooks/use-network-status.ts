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
    const updateOnline = () => setStatus({ isOnline: true, changedAt: Date.now() });
    const updateOffline = () => setStatus({ isOnline: false, changedAt: Date.now() });
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  return status;
}
