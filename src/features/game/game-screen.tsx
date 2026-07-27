"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, Crown, QrCode } from "lucide-react";
import gameLogoDark from "@/assets/brand/DNJGAME_DARK.png";
import gameLogoLight from "@/assets/brand/DNJGAME_01.png";
import { MedalBadge, PointIcon } from "@/components/ui/dnj-controls";
import { GROUP_RANKING, INDIVIDUAL_RANKING, POINTS_LOG } from "@/features/app/fixtures";
import type { AnimDir, GameTab, RankingTab, UserData } from "@/features/app/types";
import { getDnjLevel } from "@/lib/levels";
import { MomentComposer } from "@/features/moments/moment-composer";
import { QrScannerModal } from "@/features/scanner/qr-scanner-modal";
import { useNetworkStatus } from "@/hooks/use-network-status";
import type { Participation } from "@/types/experience";

const onboardingKey = (email: string) => `dnj.game.onboarding.v1.${email || "anonymous"}`;
const anim = (dir: AnimDir) => ({ animation: dir === "left" ? "slideInLeft 280ms cubic-bezier(0.22,1,0.36,1) both" : dir === "right" ? "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both" : "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both" });

function RankingRow({ item, position, group, current }: { item: { name: string; points: number; group?: string; members?: number }; position: number; group?: boolean; current?: boolean }) {
  const isChampion = group && position === 1;
  return <div className="flex items-center gap-3 px-4 py-3" style={{
    background: isChampion ? "linear-gradient(105deg, color-mix(in srgb, #f5c542 24%, var(--card)), color-mix(in srgb, #fff3b0 12%, var(--card)))" : current ? "var(--primary-alpha-15)" : group ? "var(--card)" : position <= 3 ? "color-mix(in srgb, var(--accent) 10%, var(--card))" : "transparent",
    borderBottom: "1px solid var(--border)",
    boxShadow: isChampion ? "0 5px 14px color-mix(in srgb, #b77900 18%, transparent)" : undefined,
  }}>
    {group ? isChampion ? <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "#e5a900", color: "#fff9dc", boxShadow: "0 3px 7px color-mix(in srgb, #9a6400 32%, transparent)" }}><Crown size={18} strokeWidth={2.6} aria-label="Primeiro colocado" /></span> : <span className="flex w-6 justify-center text-sm font-black" style={{ color: "var(--muted-foreground)" }}>{position}</span> : <MedalBadge position={position} />}
    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.name}{current ? " · seu grupo" : ""}</strong><small style={{ color: "var(--muted-foreground)" }}>{group ? `${item.members} membros` : item.group}</small></span>
    <strong className="text-sm" style={{ color: "var(--accent)" }}>{item.points} pts</strong>
  </div>;
}

function IndividualPodium() {
  const leaders = [
    { entry: INDIVIDUAL_RANKING[1], position: 2, tone: "#7871d7", surface: "#eeedff", height: "h-20 mt-8" },
    { entry: INDIVIDUAL_RANKING[0], position: 1, tone: "#e5a900", surface: "#fff3bd", height: "h-28" },
    { entry: INDIVIDUAL_RANKING[2], position: 3, tone: "#df6a18", surface: "#fff0e5", height: "h-16 mt-12" },
  ];

  return <section className="relative overflow-hidden rounded-3xl px-3 pb-3 pt-7 text-center" style={{ background: "radial-gradient(circle at 50% 0%, #fff7cf 0%, color-mix(in srgb, #fff7cf 58%, var(--background)) 43%, transparent 72%)" }}>
    <span aria-hidden className="absolute left-5 top-7 h-2 w-2 rotate-45 rounded-sm" style={{ background: "#e5a900" }} />
    <span aria-hidden className="absolute right-7 top-10 h-2 w-1 rotate-45 rounded-sm" style={{ background: "#df6a18" }} />
    <span aria-hidden className="absolute left-14 top-16 h-1.5 w-3 rotate-[65deg] rounded-sm" style={{ background: "#8bbd17" }} />
    <span aria-hidden className="absolute right-16 top-20 h-1.5 w-3 -rotate-[50deg] rounded-sm" style={{ background: "#7871d7" }} />
    <div className="relative grid grid-cols-3 items-end gap-2">
      {leaders.map(({ entry, position, tone, surface, height }) => <div key={entry.id} className="min-w-0">
        {position === 1 && <Crown className="mx-auto mb-1" size={31} fill="#ffd348" strokeWidth={2.2} style={{ color: "#d98d00", filter: "drop-shadow(0 3px 2px rgb(154 100 0 / 24%))" }} aria-label="Primeiro colocado" />}
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 bg-white text-xl font-black" style={{ borderColor: tone, color: tone, boxShadow: `0 5px 12px color-mix(in srgb, ${tone} 28%, transparent)` }}>{entry.name.charAt(0)}</div>
        <div className={`relative mt-2 flex ${height} flex-col justify-end rounded-t-2xl px-1 pb-3`} style={{ background: `linear-gradient(145deg, ${surface}, ${tone}22)`, boxShadow: "0 -1px 0 rgb(255 255 255 / 72%) inset" }}>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2"><MedalBadge position={position} /></span>
          <strong className="block truncate text-xs">{entry.name.split(" ")[0]}</strong>
          <small className="mt-1 font-bold" style={{ color: tone }}>{entry.points} pts</small>
        </div>
      </div>)}
    </div>
  </section>;
}

function Onboarding({ onScan, onClose }: { onScan: () => void; onClose: () => void }) {
  return <motion.div className="absolute inset-0 z-[60] grid place-items-end bg-black/45 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.section className="w-full rounded-3xl p-6" initial={{ y: 40 }} animate={{ y: 0 }} style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }} aria-label="Como funciona o DNJ Game">
      <Award size={31} style={{ color: "var(--game)" }} /><h2 className="mt-4 text-2xl font-black">Seu caminho no DNJ Game</h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Leia QR Codes, participe das atividades e ganhe pontos para você e seu grupo.</p>
      <button className="mt-6 w-full rounded-2xl py-3 font-bold text-white" style={{ background: "var(--game)" }} onClick={onScan}>Escanear agora</button>
      <button className="mt-2 w-full py-3 text-sm font-bold" style={{ color: "var(--muted-foreground)" }} onClick={onClose}>Entendi</button>
    </motion.section>
  </motion.div>;
}

function QrResult({ participation, onClose }: { participation: Participation; onClose: () => void }) {
  return <motion.div className="absolute inset-0 z-[60] grid place-items-center bg-black/45 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.section className="w-full max-w-sm rounded-3xl p-6 text-center" initial={{ scale: .94 }} animate={{ scale: 1 }} style={{ background: "var(--card)" }} aria-label="Pontos conquistados"><Award className="mx-auto" size={38} style={{ color: "var(--game)" }} /><h2 className="mt-4 text-xl font-black">Participação confirmada</h2><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{participation.activity.name} · {participation.place.name}</p><strong className="mt-5 block text-3xl" style={{ color: "var(--game)" }}>+{participation.checkInPoints} pontos</strong><p className="mt-2 text-sm">Novo total: <strong>{participation.newTotalPoints ?? participation.checkInPoints} pts</strong></p><button className="mt-6 w-full rounded-2xl py-3 font-bold text-white" style={{ background: "var(--game)" }} onClick={onClose}>Continuar</button></motion.section></motion.div>;
}

export function GameScreen({ user, theme, animDir, onPointsChange }: { user: UserData; theme: "light" | "dark"; animDir: AnimDir; onPointsChange: (points: number) => void }) {
  const [tab, setTab] = useState<GameTab>("overview"); const [rankingTab, setRankingTab] = useState<RankingTab>("individual");
  const [qrOpen, setQrOpen] = useState(false); const [result, setResult] = useState<Participation | null>(null); const [participation, setParticipation] = useState<Participation | null>(null); const [momentOpen, setMomentOpen] = useState(false); const [showAll, setShowAll] = useState(false);
  const [scanFeedback, setScanFeedback] = useState("");
  const { isOnline } = useNetworkStatus();
  const [onboarding, setOnboarding] = useState(() => { try { return !localStorage.getItem(onboardingKey(user.email)); } catch { return true; } });
  const level = getDnjLevel(user.points);
  useEffect(() => { let alive = true; fetch("/api/mock/v1/participations/current", { headers: { authorization: "Bearer mock" } }).then((r) => r.status === 204 ? null : r.json()).then((body) => alive && setParticipation(body?.participation ?? null)).catch(() => undefined); return () => { alive = false; }; }, []);
  const currentGroup = useMemo(() => GROUP_RANKING.find((entry) => entry.name.toLowerCase().includes(user.group.toLowerCase().split(" ")[0])), [user.group]);
  const closeOnboarding = () => { try { localStorage.setItem(onboardingKey(user.email), "1"); } catch {} setOnboarding(false); };
  const openScanner = () => { if (!isOnline) { setScanFeedback("Você está offline. Conecte-se à internet para escanear o QR Code."); return; } setScanFeedback(""); setQrOpen(true); };
  const handleQr = (value: Participation) => { setParticipation(value); setQrOpen(false); onPointsChange(value.newTotalPoints ?? user.points + value.checkInPoints); setResult(value); };
  const individual = showAll ? INDIVIDUAL_RANKING : INDIVIDUAL_RANKING.slice(0, 30); const groups = showAll ? GROUP_RANKING : GROUP_RANKING.slice(0, 10);
  return <div className="absolute inset-0 flex flex-col" style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", ...anim(animDir) }}>
    <header className="px-5 pb-4" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(48px + var(--safe-area-top))" }}><div className="mt-4 flex items-center justify-between"><img src={(theme === "light" ? gameLogoLight : gameLogoDark).src} alt="DNJ Game" className="h-auto w-36" /><strong className="text-3xl" style={{ color: "var(--game)" }}>{user.points}<small className="ml-1 text-sm" style={{ color: "var(--muted-foreground)" }}>pts</small></strong></div><div className="mt-4 flex rounded-xl p-1" style={{ background: "var(--muted)" }}>{(["overview", "ranking"] as GameTab[]).map((item) => <button key={item} onClick={() => setTab(item)} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: tab === item ? "var(--game)" : "transparent", color: tab === item ? "white" : "var(--muted-foreground)" }}>{item === "overview" ? "Meus Pontos" : "Ranking"}</button>)}</div></header>
    <main className="flex-1 overflow-y-auto px-5 py-5">{tab === "overview" ? <div className="flex flex-col gap-4"><section className="rounded-2xl p-4" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}><div className="flex justify-between text-sm font-bold"><span>Nível {level.name}</span><span>{level.nextPoints ? `${level.pointsToNext} pts para próximo` : "Nível máximo"}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--muted)" }}><motion.span className="block h-full rounded-full" animate={{ width: `${level.progress}%` }} style={{ background: "var(--game)" }} /></div></section>{participation?.canShareMoment && <section className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><strong>Momento DNJ</strong><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{participation.activity.name} · {participation.place.name}</p><button onClick={() => setMomentOpen(true)} className="mt-3 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--primary)" }}>Compartilhar momento</button></section>}<section><h2 className="mb-2 text-sm font-bold">Histórico de pontos</h2><div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>{POINTS_LOG.map((entry) => <div key={entry.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--border)" }}><PointIcon type={entry.icon} /><span className="flex-1 text-sm">{entry.label}</span><strong style={{ color: "var(--game)" }}>+{entry.points}</strong></div>)}</div></section></div> : <div className="flex flex-col gap-4"><div className="flex gap-2">{(["individual", "grupos"] as RankingTab[]).map((item) => <button key={item} onClick={() => { setRankingTab(item); setShowAll(false); }} className="flex-1 rounded-xl py-2 text-sm font-bold" style={{ background: rankingTab === item ? "var(--game)" : "var(--card)", color: rankingTab === item ? "white" : "var(--muted-foreground)" }}>{item === "individual" ? "Individual" : "Grupos"}</button>)}</div>{rankingTab === "individual" ? <><IndividualPodium /><div className="rounded-2xl p-4" style={{ background: "var(--primary-alpha-10)" }}><strong>Sua posição: #{user.rankPosition}</strong><span className="float-right">{user.points} pts</span></div><div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>{individual.slice(3).map((entry, index) => <RankingRow key={entry.id} item={entry} position={index + 4} current={entry.isUser} />)}</div></> : <><section className="rounded-2xl p-4" style={{ background: "var(--primary-alpha-10)" }}><strong>Seu grupo</strong><span className="float-right">{currentGroup ? `#${GROUP_RANKING.indexOf(currentGroup) + 1}` : "Sem grupo"}</span></section><div className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>{groups.map((entry, index) => <RankingRow key={entry.id} item={entry} position={index + 1} group current={entry === currentGroup} />)}</div></>}<button className="py-3 text-sm font-bold" style={{ color: "var(--game)" }} onClick={() => setShowAll((value) => !value)}>{showAll ? "Ver menos" : "Ver ranking completo"}</button></div>}</main>
    {scanFeedback && <p role="alert" className="px-5 text-sm" style={{ color: "var(--destructive)" }}>{scanFeedback}</p>}
    {!onboarding && <button onClick={openScanner} className="absolute bottom-24 right-5 grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: "var(--primary)", boxShadow: "var(--shadow-card)" }} aria-label="Escanear QR Code"><QrCode /></button>}
    <AnimatePresence>{onboarding && <Onboarding onClose={closeOnboarding} onScan={() => { closeOnboarding(); openScanner(); }} />}{qrOpen && <QrScannerModal onClose={() => setQrOpen(false)} onValidated={handleQr} />}{result && <QrResult participation={result} onClose={() => setResult(null)} />}</AnimatePresence>{momentOpen && participation && <MomentComposer participation={participation} onClose={() => setMomentOpen(false)} onCreated={() => setMomentOpen(false)} />}
  </div>;
}
