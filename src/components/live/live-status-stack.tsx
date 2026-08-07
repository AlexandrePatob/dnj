"use client";

import { Camera, Radio, Timer, UsersRound, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

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

export type LiveMomentChallenge = {
  id: string;
  title: string;
  description: string | null;
  endsAt: string;
  points: number;
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
  queueSummary,
}: {
  special: LiveSpecialEvent | null;
  momentChallenge?: LiveMomentChallenge | null;
  queueSummary?: string;
}) {
  const [, setNow] = useState(0);
  const [showMomentNotice, setShowMomentNotice] = useState(false);
  const [dismissedSpecialKey, setDismissedSpecialKey] = useState<string | null>(null);
  const announcedChallenge = useRef<string | null>(null);
  const specialKey = special ? special.id ?? `${special.title}-${special.startsAt}` : null;
  const visibleSpecial = special && dismissedSpecialKey !== specialKey ? special : null;
  const activeMomentChallenge = momentChallenge && new Date(momentChallenge.endsAt).getTime() > Date.now() ? momentChallenge : null;

  useEffect(() => setDismissedSpecialKey(null), [specialKey]);
  useEffect(() => {
    if (!visibleSpecial || visibleSpecial.status === "active") return;
    const interval = window.setInterval(() => setNow((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [visibleSpecial?.status]);
  useEffect(() => {
    if (!activeMomentChallenge || announcedChallenge.current === activeMomentChallenge.id) return;
    announcedChallenge.current = activeMomentChallenge.id;
    setShowMomentNotice(true);
    const timer = window.setTimeout(
      () => setShowMomentNotice(false),
      Math.min(6_000, Math.max(0, new Date(activeMomentChallenge.endsAt).getTime() - Date.now())),
    );
    return () => window.clearTimeout(timer);
  }, [activeMomentChallenge]);

  if (!visibleSpecial && !showMomentNotice) return null;
  const detail =
    visibleSpecial?.status === "active" ? (
      "QR disponível agora"
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
          <p className="mt-1 text-xs text-white/85">{activeMomentChallenge.title}. Vá ao DNJ Game e compartilhe seu momento.</p>
        </motion.section>
      )}
      {queueSummary && visibleSpecial && (
        <section
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <UsersRound size={15} style={{ color: "var(--primary)" }} />
          {queueSummary}
        </section>
      )}
    </aside>
  );
}
