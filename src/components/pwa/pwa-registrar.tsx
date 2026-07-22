"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type PwaStatus = "idle" | "registering" | "ready" | "update-available" | "unsupported" | "error";

interface PwaContextValue {
  status: PwaStatus;
  error: string | null;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  status: "idle",
  error: null,
  applyUpdate: () => undefined,
});

const SAFE_ERROR = "Não foi possível preparar o modo offline.";

function loadedStaticUrls(): string[] {
  const origin = window.location.origin;
  return Array.from(
    new Set(
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((value) => {
          try {
            const url = new URL(value, origin);
            return url.origin === origin && url.pathname.startsWith("/_next/static/");
          } catch {
            return false;
          }
        }),
    ),
  );
}

export function usePwa(): PwaContextValue {
  return useContext(PwaContext);
}

export function reloadPwaPage(): void {
  window.location.reload();
}

export function PwaRegistrar({
  children,
  reloadPage = reloadPwaPage,
}: {
  children: ReactNode;
  reloadPage?: () => void;
}) {
  const [status, setStatus] = useState<PwaStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const reloadRequested = useRef(false);
  const reloaded = useRef(false);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker.current) return;
    reloadRequested.current = true;
    waitingWorker.current.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker || !window.isSecureContext) {
      setStatus("unsupported");
      return;
    }

    const container = navigator.serviceWorker;
    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installing: ServiceWorker | null = null;

    const onControllerChange = () => {
      if (!reloadRequested.current || reloaded.current) return;
      reloaded.current = true;
      reloadPage();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "CACHE_READY") {
        setError(null);
        setStatus("ready");
      } else if (event.data?.type === "CACHE_ERROR") {
        setError(SAFE_ERROR);
        setStatus("error");
      }
    };
    const onStateChange = () => {
      if (installing?.state !== "installed" || !container.controller) return;
      waitingWorker.current = registration?.waiting ?? installing;
      setStatus("update-available");
    };
    const onUpdateFound = (event?: Event) => {
      installing?.removeEventListener("statechange", onStateChange);
      const currentRegistration = (event?.currentTarget as ServiceWorkerRegistration | null) ?? registration;
      registration = currentRegistration;
      installing = currentRegistration?.installing ?? null;
      installing?.addEventListener("statechange", onStateChange);
    };

    container.addEventListener("controllerchange", onControllerChange);
    container.addEventListener("message", onMessage);
    setStatus("registering");

    void container
      .register("/sw.js", { scope: "/" })
      .then(async (registered) => {
        if (disposed) return;
        registration = registered;
        registration.addEventListener("updatefound", onUpdateFound);
        if (registration.waiting) {
          waitingWorker.current = registration.waiting;
          setStatus("update-available");
          return;
        }

        const ready = await container.ready;
        if (disposed) return;
        const worker = ready.active ?? container.controller;
        if (!worker) {
          setError(SAFE_ERROR);
          setStatus("error");
          return;
        }
        worker.postMessage({ type: "CACHE_URLS", urls: loadedStaticUrls() });
      })
      .catch(() => {
        if (disposed) return;
        setError(SAFE_ERROR);
        setStatus("error");
      });

    return () => {
      disposed = true;
      container.removeEventListener("controllerchange", onControllerChange);
      container.removeEventListener("message", onMessage);
      registration?.removeEventListener("updatefound", onUpdateFound);
      installing?.removeEventListener("statechange", onStateChange);
    };
  }, [reloadPage]);

  const value = useMemo(() => ({ status, error, applyUpdate }), [applyUpdate, error, status]);
  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
