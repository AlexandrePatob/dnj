"use client";

import { Download, Share2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

import type { PwaInstallStatus, PwaStatus } from "./pwa-registrar";

interface InstallPromotionProps {
  status: PwaInstallStatus;
  pwaStatus: PwaStatus;
  isOnline: boolean;
  isIosSafari: boolean;
  hasBottomNavigation: boolean;
  onInstall: () => Promise<void> | void;
  onDismiss: () => void;
}

export function InstallPromotion({
  status,
  pwaStatus,
  isOnline,
  isIosSafari,
  hasBottomNavigation,
  onInstall,
  onDismiss,
}: InstallPromotionProps) {
  const reduceMotion = useReducedMotion();
  const [showInstructions, setShowInstructions] = useState(false);
  const instructionsId = useId();
  const isManual = status === "manual";
  const isInstalling = status === "installing";
  const isVisible = isOnline
    && pwaStatus !== "update-available"
    && (status === "available" || isManual || isInstalling);

  if (!isVisible) return null;

  return (
    <motion.aside
      animate={{ filter: "blur(0px)", opacity: 1, scale: 1, y: 0 }}
      aria-label="Instalar DNJ Game"
      className={`fixed left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl p-4 transition-none motion-reduce:transition-none ${
        hasBottomNavigation
          ? "bottom-[calc(var(--bottom-nav-total-height)+1.25rem)]"
          : "bottom-[calc(var(--safe-area-bottom)+1rem)]"
      }`}
      initial={reduceMotion ? false : { filter: "blur(6px)", opacity: 0, scale: 0.985, y: 18 }}
      role="region"
      style={{
        background: "var(--card)",
        boxShadow: "0 18px 42px rgba(0, 24, 24, 0.18)",
        color: "var(--card-foreground)",
      }}
      transition={{ duration: reduceMotion ? 0.01 : 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}
        >
          <Download size={21} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.95rem] font-bold leading-tight">DNJ Game no seu celular</h2>
          <p className="mt-1 text-xs font-medium leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            Acesse mais rápido e use o que já carregou mesmo sem sinal. Instalação pelo navegador, sem baixar APK.
          </p>
        </div>
      </div>

      {isManual && showInstructions ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="mt-3 flex gap-2 border-t pt-3 text-xs font-medium leading-relaxed motion-reduce:transition-none"
          id={instructionsId}
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          style={{ borderColor: "var(--border)", color: "var(--card-foreground)" }}
          transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <Share2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} style={{ color: "var(--primary)" }} />
          <div>
            {!isIosSafari ? <p className="font-bold">Abra esta página no Safari.</p> : null}
            <p>Toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
          </div>
        </motion.div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        {isManual ? (
          <button
            aria-controls={instructionsId}
            aria-expanded={showInstructions}
            className="min-h-10 flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-[0_6px_16px_rgba(232,116,37,0.24)] transition-[transform,background-color] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
            onClick={() => setShowInstructions(true)}
            style={{ background: "var(--primary)" }}
            type="button"
          >
            Como instalar
          </button>
        ) : (
          <button
            aria-label={isInstalling ? "Abrindo instalação" : "Instalar app"}
            className="min-h-10 flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-[0_6px_16px_rgba(232,116,37,0.24)] transition-[transform,background-color] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
            disabled={isInstalling}
            onClick={() => void onInstall()}
            style={{ background: "var(--primary)" }}
            type="button"
          >
            {isInstalling ? "Abrindo…" : "Instalar pelo navegador"}
          </button>
        )}
        <button
          className="min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition-colors hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none"
          onClick={onDismiss}
          style={{ color: "var(--muted-foreground)" }}
          type="button"
        >
          Agora não
        </button>
      </div>
    </motion.aside>
  );
}
