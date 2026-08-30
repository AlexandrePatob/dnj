"use client";

import { ArrowRight, Bell, Camera, Radio, Timer, UsersRound, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { MomentChallenge } from "@/lib/api/moment-challenges";

export type LiveSpecialEvent = {
  id?: string;
  title: string;
  status: "teaser" | "active";
  startsAt: string;
  endsAt: string;
  teaserSeconds: number;
  points: number;
  qrAvailableAt?: string | null;
};

export type LiveMomentChallenge = MomentChallenge;

export type LiveQueueNotification = {
  title: string;
  body: string;
};

export type LiveAdminNotification = {
  id: string;
  title: string;
  body: string;
};

function countdown(iso: string) {
  const seconds = Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / 1000),
  );
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LiveStatusStack({
  special,
  momentChallenge,
  queueNotification,
  adminNotification,
  onOpenGame,
  onOpenQueue,
  onReadAdmin,
}: {
  special: LiveSpecialEvent | null;
  momentChallenge?: LiveMomentChallenge | null;
  queueNotification?: LiveQueueNotification | null;
  adminNotification?: LiveAdminNotification | null;
  onOpenGame?: () => void;
  onOpenQueue?: () => void;
  onReadAdmin?: (notificationId: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [showMomentNotice, setShowMomentNotice] = useState(false);
  const [dismissedSpecialKey, setDismissedSpecialKey] = useState<string | null>(null);
  const announcedChallenge = useRef<string | null>(null);
  const specialKey = special ? special.id ?? `${special.title}-${special.startsAt}` : null;
  const visibleSpecial = special && dismissedSpecialKey !== specialKey && new Date(special.endsAt).getTime() > now ? special : null;
  const activeMomentChallenge = momentChallenge && (!momentChallenge.startsAt || new Date(momentChallenge.startsAt).getTime() <= now) && (!momentChallenge.endsAt || new Date(momentChallenge.endsAt).getTime() > now) ? momentChallenge : null;

  useEffect(() => {
    if (!visibleSpecial && !activeMomentChallenge) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [activeMomentChallenge, visibleSpecial?.status]);
  useEffect(() => {
    if (!activeMomentChallenge || announcedChallenge.current === activeMomentChallenge.id) return;
    announcedChallenge.current = activeMomentChallenge.id;
    setShowMomentNotice(true);
  }, [activeMomentChallenge]);
  if (!visibleSpecial && !showMomentNotice && !queueNotification && !adminNotification) return null;
  const detail =
    visibleSpecial?.status === "active" ? (
      <><Timer className="mr-1 inline" size={12} /> Encerra em {countdown(visibleSpecial.endsAt)}</>
    ) : visibleSpecial ? (
      <>
        <Timer className="mr-1 inline" size={12} /> QR em {countdown(visibleSpecial.qrAvailableAt ?? visibleSpecial.startsAt)}
      </>
    ) : null;

  return (
    <aside
      className="absolute left-3 right-3 z-[45] grid gap-2"
      style={{ top: "calc(48px + var(--safe-area-top) + 8px)" }}
      aria-label="Atualizações ao vivo"
    >
      {visibleSpecial && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-3 text-white"
          style={{ background: "#0d1a1a", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <Radio size={16} style={{ color: "var(--game)" }} />
            <strong className="flex-1 text-sm">Evento especial</strong>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[.62rem] font-bold uppercase">
              {visibleSpecial.points} pontos
            </span>
            <button
              type="button"
              aria-label="Fechar evento especial"
              className="grid h-7 w-7 place-items-center rounded-full text-white/80 hover:bg-white/10"
              onClick={() => setDismissedSpecialKey(specialKey)}
            >
              <X size={15} />
            </button>
          </div>
          <p className="mt-1 text-xs text-white/75">{visibleSpecial.title} · {detail}</p>
        </motion.section>
      )}
      {showMomentNotice && activeMomentChallenge && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-3 text-white"
          style={{
            background: "var(--game)",
            boxShadow: "var(--shadow-card)",
          }}
          role="status"
        >
          <div className="flex items-center gap-2">
            <Camera size={16} />
            <strong className="flex-1 text-sm">Desafio Momento DNJ</strong>
            <span
              className="rounded-full px-2 py-1 text-[.62rem] font-bold uppercase"
              style={{ background: "rgba(255,255,255,.25)" }}
            >
              {activeMomentChallenge.points} pontos
            </span>
          </div>
          <p className="mt-1 text-xs text-white/85">{activeMomentChallenge.title}. Abra o DNJ Game para participar.</p>
          {onOpenGame && <button type="button" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-2 text-xs font-bold" onClick={() => { setShowMomentNotice(false); onOpenGame(); }}>Ver desafio <ArrowRight size={14} /></button>}
        </motion.section>
      )}
      {queueNotification && (
        <section
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <UsersRound size={15} style={{ color: "var(--primary)" }} />
          <span className="flex-1">
            <strong className="block">{queueNotification.title}</strong>
            <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>{queueNotification.body}</span>
          </span>
          {onOpenQueue && <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold" style={{ color: "var(--primary)" }} onClick={onOpenQueue}>Ver fila <ArrowRight size={14} /></button>}
        </section>
      )}
      {adminNotification && (
        <section
          role="status"
          tabIndex={onReadAdmin ? 0 : undefined}
          aria-label={onReadAdmin ? `Ler notificação: ${adminNotification.title}` : undefined}
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ background: "var(--card)", border: "1px solid var(--border)", cursor: onReadAdmin ? "pointer" : undefined }}
          onClick={onReadAdmin ? () => onReadAdmin(adminNotification.id) : undefined}
          onKeyDown={onReadAdmin ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onReadAdmin(adminNotification.id); } } : undefined}
        >
          <Bell size={15} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
          <span>
            <strong className="block font-bold">{adminNotification.title}</strong>
            <span style={{ color: "var(--muted-foreground)" }}>{adminNotification.body}</span>
          </span>
        </section>
      )}
    </aside>
  );
}
