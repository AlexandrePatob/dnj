"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

import type { PwaStatus } from "./pwa-registrar";

interface ConnectivityStatusProps {
  isOnline: boolean;
  pwaStatus: PwaStatus;
  onRetry?: () => void;
  onApplyUpdate?: () => void;
}

export function ConnectivityStatus({
  isOnline,
  pwaStatus,
  onRetry,
  onApplyUpdate,
}: ConnectivityStatusProps) {
  const [connectivityHistory, setConnectivityHistory] = useState({
    isOnline,
    wasOffline: !isOnline,
  });
  const [reconnectionAcknowledged, setReconnectionAcknowledged] = useState(false);
  if (connectivityHistory.isOnline !== isOnline) {
    setConnectivityHistory({
      isOnline,
      wasOffline: connectivityHistory.wasOffline || !isOnline,
    });
    if (!isOnline && reconnectionAcknowledged) setReconnectionAcknowledged(false);
  }

  let content: React.ReactNode = null;

  if (!isOnline) {
    content = (
      <>
        <WifiOff aria-label="Offline" size={17} />
        <span className="flex-1 text-sm font-semibold">Sem conexão</span>
      </>
    );
  } else if (pwaStatus === "update-available") {
    content = (
      <>
        <RefreshCw aria-hidden="true" size={17} />
        <span className="flex-1 text-sm font-semibold">Nova versão disponível</span>
        <button className="text-xs font-bold" onClick={onApplyUpdate} type="button">
          Atualizar agora
        </button>
      </>
    );
  } else if (connectivityHistory.wasOffline && !reconnectionAcknowledged) {
    content = (
      <>
        <Wifi aria-hidden="true" size={17} />
        <span className="flex-1 text-sm font-semibold">Conexão restabelecida</span>
        <button
          className="text-xs font-bold"
          onClick={() => {
            setReconnectionAcknowledged(true);
            onRetry?.();
          }}
          type="button"
        >
          Tentar novamente
        </button>
      </>
    );
  }

  if (!content) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border px-3 py-2 shadow-lg transition-opacity motion-reduce:transition-none"
      role="status"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        color: "var(--card-foreground)",
      }}
    >
      {content}
    </div>
  );
}
