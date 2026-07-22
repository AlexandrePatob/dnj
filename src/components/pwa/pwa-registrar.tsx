"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type PwaStatus = "idle" | "registering" | "ready" | "update-available" | "unsupported" | "error";
export type PwaInstallStatus = "unavailable" | "available" | "installing" | "manual" | "installed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextValue {
  status: PwaStatus;
  error: string | null;
  installStatus: PwaInstallStatus;
  isIosSafari: boolean;
  applyUpdate: () => void;
  requestInstall: () => Promise<void>;
  dismissInstall: () => void;
}

const PwaContext = createContext<PwaContextValue>({
  status: "idle",
  error: null,
  installStatus: "unavailable",
  isIosSafari: false,
  applyUpdate: () => undefined,
  requestInstall: async () => undefined,
  dismissInstall: () => undefined,
});

const SAFE_ERROR = "Não foi possível preparar o modo offline.";
const INSTALL_PROMOTION_DISMISSED_UNTIL = "dnj.pwa.install-promotion.dismissed-until.v1";
const INSTALL_PROMOTION_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSafariOnIos(): boolean {
  return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function isInstallPromotionSnoozed(): boolean {
  try {
    const dismissedUntil = Number(window.localStorage.getItem(INSTALL_PROMOTION_DISMISSED_UNTIL));
    return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
  } catch {
    return false;
  }
}

function snoozeInstallPromotion(): void {
  try {
    window.localStorage.setItem(
      INSTALL_PROMOTION_DISMISSED_UNTIL,
      String(Date.now() + INSTALL_PROMOTION_SNOOZE_MS),
    );
  } catch {
    // The in-memory state still dismisses the promotion for this session.
  }
}

function clearInstallPromotionSnooze(): void {
  try {
    window.localStorage.removeItem(INSTALL_PROMOTION_DISMISSED_UNTIL);
  } catch {
    // Storage is optional progressive enhancement.
  }
}

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
  const [installStatus, setInstallStatus] = useState<PwaInstallStatus>("unavailable");
  const [isIosSafari, setIsIosSafari] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const installPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const reloadRequested = useRef(false);
  const reloaded = useRef(false);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker.current) return;
    reloadRequested.current = true;
    waitingWorker.current.postMessage({ type: "SKIP_WAITING" });
  }, []);

  const dismissInstall = useCallback(() => {
    installPrompt.current = null;
    snoozeInstallPromotion();
    setInstallStatus("unavailable");
  }, []);

  const requestInstall = useCallback(async () => {
    const promptEvent = installPrompt.current;
    if (!promptEvent || installStatus !== "available") return;
    installPrompt.current = null;
    setInstallStatus("installing");
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        clearInstallPromotionSnooze();
        setInstallStatus("installed");
      } else {
        snoozeInstallPromotion();
        setInstallStatus("unavailable");
      }
    } catch {
      setInstallStatus("unavailable");
    }
  }, [installStatus]);

  useEffect(() => {
    let disposed = false;
    const standalone = isStandalone();
    const iosDevice = isIosDevice();
    const iosSafari = iosDevice && isSafariOnIos();

    queueMicrotask(() => {
      if (disposed) return;
      setIsIosSafari(iosSafari);
      if (standalone) {
        setInstallStatus("installed");
      } else if (iosDevice && !isInstallPromotionSnoozed()) {
        setInstallStatus("manual");
      }
    });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandalone() || isInstallPromotionSnoozed()) return;
      installPrompt.current = event as BeforeInstallPromptEvent;
      setInstallStatus("available");
    };
    const onAppInstalled = () => {
      installPrompt.current = null;
      clearInstallPromotionSnooze();
      setInstallStatus("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker || !window.isSecureContext) {
      queueMicrotask(() => {
        if (!disposed) setStatus("unsupported");
      });
      return () => {
        disposed = true;
      };
    }

    const container = navigator.serviceWorker;
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
        setStatus((current) => current === "update-available" ? current : "ready");
      } else if (event.data?.type === "CACHE_ERROR") {
        setError(SAFE_ERROR);
        setStatus((current) => current === "update-available" ? current : "error");
      }
    };
    const onFocus = async () => {
      const registrations = typeof container.getRegistrations === "function"
        ? await container.getRegistrations()
        : [await container.getRegistration()].filter((value): value is ServiceWorkerRegistration => Boolean(value));
      const currentRegistration = registrations.find((value) => value.waiting);
      if (disposed || !currentRegistration?.waiting) return;
      registration = currentRegistration;
      waitingWorker.current = currentRegistration.waiting;
      setStatus("update-available");
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
    window.addEventListener("focus", onFocus);
    queueMicrotask(() => {
      if (!disposed) setStatus((current) => current === "update-available" ? current : "registering");
    });

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
      window.removeEventListener("focus", onFocus);
      registration?.removeEventListener("updatefound", onUpdateFound);
      installing?.removeEventListener("statechange", onStateChange);
    };
  }, [reloadPage]);

  const value = useMemo(() => ({
    status,
    error,
    installStatus,
    isIosSafari,
    applyUpdate,
    requestInstall,
    dismissInstall,
  }), [applyUpdate, dismissInstall, error, installStatus, isIosSafari, requestInstall, status]);
  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}
