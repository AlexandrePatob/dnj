"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { QrCode } from "lucide-react";
import gameLogoDark from "@/assets/brand/DNJGAME_DARK.png";
import gameLogoLight from "@/assets/brand/DNJGAME_01.png";
import { GameIcon, MedalBadge, PointIcon } from "@/components/ui/dnj-controls";
import { TOP3_BG } from "@/features/app/constants";
import { GROUP_RANKING, INDIVIDUAL_RANKING, POINTS_LOG } from "@/features/app/fixtures";
import type { AnimDir, GameTab, RankingTab, UserData } from "@/features/app/types";
import { QrScannerModal } from "@/features/scanner/qr-scanner-modal";
import { MomentComposer } from "@/features/moments/moment-composer";
import type { Participation } from "@/types/experience";
function animStyle(dir: AnimDir): React.CSSProperties { const map: Record<AnimDir,string>={right:"slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",left:"slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",up:"fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both"}; return { animation: map[dir] }; }
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const reduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      const reducedRaf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(reducedRaf);
    }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return value;
}

/* function QRModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        onClick={onClose}
        className="absolute right-6 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ top: "calc(48px + var(--safe-area-top))", background: "var(--muted)" }}
      >
        <X size={18} style={{ color: "var(--foreground)" }} />
      </button>

      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--primary-alpha-15)" }}
        >
          <Camera size={26} style={{ color: "var(--primary)" }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          Escanear QR Code
        </h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Aponte a câmera para um QR Code do evento
        </p>
      </div>

      <div style={{ position: "relative", width: "256px", height: "256px", marginBottom: "32px" }}>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <div
            key={c}
            style={{
              position:     "absolute",
              width:        "32px",
              height:       "32px",
              top:          c.startsWith("t") ? 0 : undefined,
              bottom:       c.startsWith("b") ? 0 : undefined,
              left:         c.endsWith("l")   ? 0 : undefined,
              right:        c.endsWith("r")   ? 0 : undefined,
              borderTop:    c.startsWith("t") ? "3px solid var(--primary)" : undefined,
              borderBottom: c.startsWith("b") ? "3px solid var(--primary)" : undefined,
              borderLeft:   c.endsWith("l")   ? "3px solid var(--primary)" : undefined,
              borderRight:  c.endsWith("r")   ? "3px solid var(--primary)" : undefined,
              borderRadius: c === "tl" ? "8px 0 0 0" : c === "tr" ? "0 8px 0 0" : c === "bl" ? "0 0 0 8px" : "0 0 8px 0",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute", inset: "14px", borderRadius: "10px",
            background: "var(--muted)", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", opacity: 0.3 }}>
            <QrCode size={44} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 8px" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Câmera</p>
          </div>
          <div
            style={{
              position: "absolute", left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, transparent 0%, var(--primary) 30%, var(--primary) 70%, transparent 100%)",
              animation: "scanLine 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
            }}
          />
        </div>
      </div>

      <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
        Posicione o QR Code dentro da área demarcada
      </p>
    </motion.div>
  );
} */
function RankRow({
  position, name, group, points, isUser, isLast, showGroupLabel = true,
}: {
  position: number; name: string; group: string; points: number;
  isUser?: boolean; isLast?: boolean; showGroupLabel?: boolean;
}) {
  const isTop3 = position <= 3;
  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{
        paddingTop:    isTop3 ? "18px" : "14px",
        paddingBottom: isTop3 ? "18px" : "14px",
        borderBottom:  isLast ? "none" : "1px solid var(--border)",
        background:    isUser ? "var(--primary-alpha-10)" : isTop3 ? TOP3_BG[position] : "transparent",
      }}
    >
      <MedalBadge position={position} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isUser ? "var(--primary)" : "var(--foreground)" }}>
          {name}{isUser && " 👤"}
        </p>
        {showGroupLabel && (
          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{group}</p>
        )}
      </div>
      <span className="text-sm font-bold flex-shrink-0" style={{ color: isUser ? "var(--primary)" : "var(--accent)" }}>
        {points} pts
      </span>
    </div>
  );
}

function UserPositionBanner({
  rank, label, sublabel, points,
}: {
  rank: number; label: string; sublabel?: string; points: number;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: "var(--primary)", boxShadow: "0 4px 20px var(--primary-alpha-40)" }}
    >
      <span className="text-white font-black text-[36px]" style={{ minWidth: "36px", fontVariantNumeric: "tabular-nums" }}>
        #{rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{label}</p>
        {sublabel && <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{sublabel}</p>}
      </div>
      <span className="text-white font-bold text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
        {points} pts
      </span>
    </div>
  );
}

export function GameScreen({ user, theme, animDir }: { user: UserData; theme: "light" | "dark"; animDir: AnimDir }) {
  const [tab, setTab]         = useState<GameTab>("overview");
  const [rankTab, setRankTab] = useState<RankingTab>("individual");
  const [qrOpen, setQrOpen]   = useState(false);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [momentOpen, setMomentOpen] = useState(false);
  const count = useCountUp(user.points, 900);
  const [showQrTooltip, setShowQrTooltip] = useState(() => {
    try { return !localStorage.getItem("dnj_qr_seen"); } catch { return true; }
  });

  function dismissTooltip() {
    try { localStorage.setItem("dnj_qr_seen", "1"); } catch { /* noop */ }
    setShowQrTooltip(false);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/mock/v1/participations/current", { headers: { authorization: "Bearer mock" } })
      .then(async (response) => response.status === 204 ? null : response.json())
      .then((body) => { if (!cancelled) setParticipation(body?.participation ?? null); })
      .catch(() => { if (!cancelled) setParticipation(null); });
    return () => { cancelled = true; };
  }, []);

  const userEntry      = INDIVIDUAL_RANKING.find((e) => e.isUser);
  const userGroupEntry = user.group
    ? GROUP_RANKING.find((g) => g.name.toLowerCase().includes(user.group.toLowerCase().split(" ")[0]))
    : null;
  const userGroupRank  = userGroupEntry ? GROUP_RANKING.indexOf(userGroupEntry) + 1 : null;

  return (
    <div
      key="game"
      className="absolute inset-0 flex flex-col"
      style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", ...animStyle(animDir) }}
    >
      {/* Header */}
      <div
        className="px-6 pb-4 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(48px + var(--safe-area-top))" }}
      >
        <div className="flex items-center justify-between mb-4" style={{ marginTop: "20px" }}>
          <img
            src={(theme === "light" ? gameLogoLight : gameLogoDark).src}
            alt="DNJ Game 2026"
            style={{ width: "146px", maxWidth: "52%", height: "auto", objectFit: "contain" }}
          />
          <div className="text-right">
            <span
              className="font-black leading-none"
              style={{ fontSize: "2.25rem", color: "var(--accent)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
            >
              {count}
            </span>
            <span className="font-semibold ml-1" style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>pts</span>
          </div>
        </div>

        <div className="flex rounded-xl p-1" style={{ background: "var(--muted)" }}>
          {([
            { id: "overview" as GameTab, label: "Meus Pontos" },
            { id: "ranking"  as GameTab, label: "Ranking"     },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? "var(--primary)" : "transparent",
                color:      tab === t.id ? "white" : "var(--muted-foreground)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {tab === "overview" && (
          <div className="px-5 pt-5 flex flex-col gap-5 pb-24">
            <button
              type="button"
              onClick={() => { dismissTooltip(); setQrOpen(true); }}
              className="w-full rounded-2xl px-5 py-5 text-left transition-transform active:scale-[0.98]"
              style={{ background: "var(--primary)", color: "white", boxShadow: "0 12px 28px var(--primary-alpha-40)" }}
            >
              <span className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.16)" }}>
                  <QrCode size={30} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">Escanear QR Code</span>
                  <span className="mt-1 block text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>Participe de uma atividade e ganhe pontos</span>
                </span>
              </span>
            </button>

            {participation && (
              <div className="rounded-2xl px-4 py-3" style={{ background: "var(--primary-alpha-10)", border: "1px solid var(--primary-alpha-40)" }}>
                <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>Participação ativa</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{participation.activity.name} · {participation.place.name} · +{participation.checkInPoints} pontos</p>
                {participation.canShareMoment && <button type="button" onClick={() => setMomentOpen(true)} className="mt-3 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "var(--primary)", color: "white" }}>Compartilhar momento</button>}
              </div>
            )}

            {/* Ranking summary — onboarding or live position */}
            {showQrTooltip ? (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center"
                style={{
                  background: "var(--card)",
                  border:     "1px solid var(--border)",
                  padding:    "32px 24px",
                  animation:  "fadeUp 260ms cubic-bezier(0.22,1,0.36,1) both",
                }}
              >
                <div
                  style={{
                    width: "52px", height: "52px", borderRadius: "14px",
                    background: "var(--primary-alpha-15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <GameIcon active><QrCode size={26} style={{ color: "var(--primary)" }} /></GameIcon>
                </div>
                <p
                  className="font-bold mb-2"
                  style={{ fontSize: "1.0625rem", color: "var(--foreground)", lineHeight: 1.35 }}
                >
                  Comece a jogar aqui!
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Procure o QR code para participar
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="flex"
                  style={{ borderBottom: userGroupRank ? "1px solid var(--border)" : "none" }}
                >
                  {/* Individual rank */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center py-5"
                    style={{ borderRight: userGroupRank ? "1px solid var(--border)" : "none" }}
                  >
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                      Ranking Individual
                    </p>
                    <span
                      className="font-black leading-none"
                      style={{ fontSize: "3rem", color: "var(--primary)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
                    >
                      #{user.rankPosition}
                    </span>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      entre {INDIVIDUAL_RANKING.length} participantes
                    </p>
                  </div>

                  {/* Group rank — only if user has group */}
                  {userGroupRank && (
                    <div className="flex-1 flex flex-col items-center justify-center py-5">
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                        Ranking do Grupo
                      </p>
                      <span
                        className="font-black leading-none"
                        style={{ fontSize: "3rem", color: "var(--chart-2)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
                      >
                        #{userGroupRank}
                      </span>
                      <p className="text-xs mt-1 text-center px-2 truncate max-w-full" style={{ color: "var(--muted-foreground)" }}>
                        {userGroupEntry?.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <h3 className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--foreground)" }}>
                Histórico de pontos
              </h3>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                {POINTS_LOG.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < POINTS_LOG.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}
                    >
                      <PointIcon type={entry.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {entry.label}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.time}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>
                      +{entry.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking" && (
          <div className="px-5 pt-4 flex flex-col gap-4 pb-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {(["individual", "grupos"] as RankingTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRankTab(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: rankTab === t ? "var(--primary-alpha-15)" : "var(--card)",
                    color:      rankTab === t ? "var(--primary)" : "var(--muted-foreground)",
                    border:     `1px solid ${rankTab === t ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  {t === "individual" ? "Individual" : "Grupos"}
                </button>
              ))}
            </div>

            {/* User position banner — TOP of list */}
            {rankTab === "individual" && userEntry && (
              <UserPositionBanner
                rank={user.rankPosition}
                label="Sua posição"
                sublabel={user.group || "Sem grupo"}
                points={user.points}
              />
            )}
            {rankTab === "grupos" && userGroupRank && userGroupEntry && (
              <UserPositionBanner
                rank={userGroupRank}
                label={userGroupEntry.name}
                sublabel={`${userGroupEntry.members} membros`}
                points={userGroupEntry.points}
              />
            )}

            {/* List */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {rankTab === "individual"
                ? INDIVIDUAL_RANKING.slice(0, 30).map((entry, i, arr) => (
                    <RankRow
                      key={entry.id}
                      position={i + 1}
                      name={entry.name}
                      group={entry.group}
                      points={entry.points}
                      isUser={entry.isUser}
                      isLast={i === arr.length - 1}
                    />
                  ))
                : GROUP_RANKING.slice(0, 10).map((entry, i, arr) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4"
                      style={{
                        paddingTop:    i < 3 ? "18px" : "14px",
                        paddingBottom: i < 3 ? "18px" : "14px",
                        borderBottom:  i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        background:    i < 3 ? TOP3_BG[i + 1] : "transparent",
                      }}
                    >
                      <MedalBadge position={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{entry.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.members} membros</p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>
                        {entry.points} pts
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>{qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} onValidated={(value) => { setParticipation(value); setQrOpen(false); }} />}</AnimatePresence>
      {momentOpen && participation && <MomentComposer participation={participation} onClose={() => setMomentOpen(false)} onCreated={() => setMomentOpen(false)} />}
    </div>
  );
}

// ─── QUEUE SCREEN (Fila Esperança) ────────────────────────────────────────────
