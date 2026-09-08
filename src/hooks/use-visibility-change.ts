"use client";

import { useEffect, useRef, useState } from "react";

export function useVisibilityChange(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

export function useForegroundRefresh(
  onRefresh: () => void | Promise<void>,
  options: { debounceMs?: number; enabled?: boolean } = {}
): void {
  const { debounceMs = 1000, enabled = true } = options;
  const isVisible = useVisibilityChange();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const prevVisibleRef = useRef(isVisible);

  useEffect(() => {
    if (!enabled) return;

    const wasHidden = !prevVisibleRef.current;
    const nowVisible = isVisible;

    if (wasHidden && nowVisible) {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (timeSinceLastRefresh >= debounceMs) {
        lastRefreshRef.current = now;
        void onRefresh();
      } else {
        debounceTimerRef.current = setTimeout(() => {
          lastRefreshRef.current = Date.now();
          void onRefresh();
        }, debounceMs - timeSinceLastRefresh);
      }
    }

    prevVisibleRef.current = nowVisible;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isVisible, onRefresh, debounceMs, enabled]);
}