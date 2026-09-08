"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Award, BookOpen, Camera, Church, Crown, Footprints, Hammer, Info, LockKeyhole, MonitorPlay, QrCode, Send, Sprout, X } from "lucide-react";
import gameLogoDark from "@/assets/brand/DNJGAME_DARK.png";
import gameLogoLight from "@/assets/brand/DNJGAME_01.png";
import { MedalBadge, PointIcon } from "@/components/ui/dnj-controls";
import type {
  AnimDir,
  GameTab,
  RankingTab,
  UserData,
} from "@/features/app/types";
import { DNJ_LEVELS, getDnjLevel } from "@/lib/levels";
import participantStyles from "@/components/layout/participant.module.css";
import { MomentComposer } from "@/features/moments/moment-composer";
import { MomentChallengeCard } from "@/features/moments/moment-challenge-card";
import type { LiveMomentChallenge } from "@/components/live/live-status-stack";
import {
  QrScannerModal,
  type QrValidation,
} from "@/features/scanner/qr-scanner-modal";
import { QrSuccessCelebration } from "@/features/scanner/qr-success-celebration";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { gameApi, type QrActivityKind } from "@/lib/api/game";
import type { Participation } from "@/types/experience";

type RankingEntry = {
  id: string;
  name: string;
  points: number;
  group: string;
  isUser: boolean;
};
type GroupEntry = { id: string; name: string; points: number; members: number };
type GameOverview = {
  individual: RankingEntry[];
  groups: GroupEntry[];
  pointEntries: { id: string; label: string; points: number; icon: string }[];
  current: { groupId: string | null; rankPosition: number; points?: number };
};
type LiveRun = {
  id: string;
  status: "draft" | "active" | "paused" | "results" | "completed" | "cancelled";
  gameName: string;
  points?: number;
};
type MomentCelebration = { points: number; label: string; durationMs?: number };
const LIVE_RUN_POLL_MS = 5_000;
const levelIcons = [Sprout, Footprints, BookOpen, Send, Hammer, Church];

const onboardingKey = (email: string) =>
  `dnj.game.onboarding.v1.${email || "anonymous"}`;
const anim = (dir: AnimDir) => ({
  animation:
    dir === "left"
      ? "slideInLeft 280ms cubic-bezier(0.22,1,0.36,1) both"
      : dir === "right"
        ? "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both"
        : "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both",
});

function RankingRow({
  item,
  position,
  group,
  current,
}: {
  item: { name: string; points: number; group?: string; members?: number };
  position: number;
  group?: boolean;
  current?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
      style={{
        borderColor: "var(--border)",
        background: current ? "var(--primary-alpha-15)" : "var(--card)",
      }}
    >
      {group && position === 1 ? (
        <Crown
          size={20}
          style={{ color: "#e5a900" }}
          aria-label="Primeiro colocado"
        />
      ) : group ? (
        <span className="w-5 text-center text-sm font-black">{position}</span>
      ) : (
        <MedalBadge position={position} />
      )}
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm">
          {item.name}
          {current ? " · seu grupo" : ""}
        </strong>
        <small style={{ color: "var(--muted-foreground)" }}>
          {group ? `${item.members} membros` : item.group}
        </small>
      </span>
      <strong className="text-sm" style={{ color: "var(--accent)" }}>
        {item.points} pts
      </strong>
    </div>
  );
}

function Podium({ entries }: { entries: RankingEntry[] }) {
  if (entries.length < 3) return null;
  const places = [
    [entries[1], 2, "h-20 mt-8", "#7871d7"],
    [entries[0], 1, "h-28", "#e5a900"],
    [entries[2], 3, "h-16 mt-12", "#df6a18"],
  ] as const;
  return (
    <section
      className="grid grid-cols-3 items-end gap-2 rounded-3xl px-3 pb-3 pt-7 text-center"
      style={{ background: "var(--primary-alpha-10)" }}
    >
      {places.map(([entry, position, height, tone]) => (
        <div key={entry.id}>
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-full border-4 bg-white text-xl font-black"
            style={{ borderColor: tone, color: tone }}
          >
            {entry.name.charAt(0)}
          </div>
          <div
            className={`mt-2 flex ${height} flex-col justify-end rounded-t-2xl px-1 pb-3`}
            style={{ background: `${tone}22` }}
          >
            <span className="mb-1">
              <MedalBadge position={position} />
            </span>
            <strong className="truncate text-xs">
              {entry.name.split(" ")[0]}
            </strong>
            <small style={{ color: tone }}>{entry.points} pts</small>
          </div>
        </div>
      ))}
    </section>
  );
}

function Onboarding({
  onScan,
  onClose,
}: {
  onScan: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-[60] grid place-items-end bg-black/45 px-4 pb-[calc(var(--bottom-nav-total-height)+1rem)] pt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.section
        className="w-full rounded-3xl p-6"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        style={{ background: "var(--card)" }}
      >
        <Award size={31} style={{ color: "var(--game)" }} />
        <h2 className="mt-4 text-2xl font-black">Seu caminho no DNJ Game</h2>
        <p
          className="mt-3 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Leia QR Codes, participe das atividades e ganhe pontos para você e seu
          grupo.
        </p>
        <button
          className="mt-6 w-full rounded-2xl py-3 font-bold text-white"
          style={{ background: "var(--game)" }}
          onClick={onScan}
        >
          Escanear agora
        </button>
        <button
          className="mt-2 w-full py-3 text-sm font-bold"
          onClick={onClose}
        >
          Entendi
        </button>
      </motion.section>
    </motion.div>
  );
}

function LiveRunOverlay({ run }: { run: LiveRun }) {
  const copy =
    run.status === "draft"
      ? [
          "Você entrou na partida",
          "Aguarde o gestor iniciar a atividade. Você não precisa escanear novamente.",
        ]
      : run.status === "active"
        ? [
            "Partida em andamento",
            "Siga as orientações do gestor e aproveite a atividade.",
          ]
        : run.status === "paused"
          ? ["Partida pausada", "Aguarde a retomada da atividade."]
          : run.status === "results"
            ? [
                "Resultado em apuração",
                "O gestor está confirmando a pontuação dos participantes.",
              ]
            : run.status === "completed"
              ? [
                  "Partida finalizada",
                  "Sua participação foi concluída. Voltando ao DNJ Game...",
                ]
              : [
                  "Partida encerrada",
                  "Esta atividade foi cancelada. Voltando ao DNJ Game...",
                ];
  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label="Status da partida"
      className="absolute inset-0 z-50 grid place-items-center p-6 text-center"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-7"
        style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}
      >
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl"
          style={{
            background: "var(--primary-alpha-15)",
            color: "var(--primary)",
          }}
        >
          {run.status === "active"
            ? "▶"
            : run.status === "completed"
              ? "✓"
              : "…"}
        </span>
        <p
          className="mt-6 text-xs font-black uppercase tracking-[.12em]"
          style={{ color: "var(--primary)" }}
        >
          {run.gameName}
        </p>
        <h2 className="mt-2 text-2xl font-black">{copy[0]}</h2>
        <p
          className="mt-3 text-sm leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {copy[1]}
        </p>
        {["draft", "active", "paused", "results"].includes(run.status) ? (
          <span
            className="mx-auto mt-6 block h-1.5 w-24 overflow-hidden rounded-full"
            style={{ background: "var(--muted)" }}
          >
            <span
              className="block h-full w-1/2 rounded-full"
              style={{
                background: "var(--primary)",
                animation: "scanLine 1.4s ease-in-out infinite",
              }}
            />
          </span>
        ) : null}
      </div>
    </motion.section>
  );
}

export function GameScreen({
  user,
  theme,
  animDir,
  momentChallenge,
  onMomentCompleted,
  onPointsChange,
}: {
  user: UserData;
  theme: "light" | "dark";
  animDir: AnimDir;
  momentChallenge?: LiveMomentChallenge | null;
  onMomentCompleted?: (challengeId: string) => void;
  onPointsChange: (points: number) => void;
}) {
  const [tab, setTab] = useState<GameTab>("overview");
  const [pointsInfoOpen, setPointsInfoOpen] = useState(false);
  const [rankingTab, setRankingTab] = useState<RankingTab>("individual");
  const [qrOpen, setQrOpen] = useState(false);
  const [celebration, setCelebration] = useState<
    | (Participation & { activityKind?: QrActivityKind; qrAction?: "joined" | "scored"; alreadyRegistered?: boolean })
    | MomentCelebration
    | null
  >(null);
  const [participation, setParticipation] = useState<Participation | null>(
    null,
  );
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [momentOpen, setMomentOpen] = useState(false);
  const [completedMomentChallengeId, setCompletedMomentChallengeId] = useState<
    string | null
  >(null);
  const [showAll, setShowAll] = useState(false);
  const [scanFeedback, setScanFeedback] = useState("");
  const [overview, setOverview] = useState<GameOverview | null>(null);
  const refreshedTerminalRunId = useRef<string | null>(null);
  const { isOnline } = useNetworkStatus();
  const [onboarding, setOnboarding] = useState(() => {
    try {
      return !localStorage.getItem(onboardingKey(user.email));
    } catch {
      return true;
    }
  });
  const level = getDnjLevel(user.points);
  const loadLiveRun = useCallback(async (runId?: string) => {
    return (await gameApi.currentRun(runId)) as LiveRun | null;
  }, []);
  const loadOverview = useCallback(async () => {
    const nextOverview = (await gameApi.overview()) as unknown as GameOverview;
    return nextOverview;
  }, []);
  const refreshOverview = useCallback(async () => {
    const nextOverview = await loadOverview();
    setOverview(nextOverview);
    const ownPoints =
      nextOverview.current?.points ??
      nextOverview.individual.find((entry) => entry.isUser)?.points;
    if (ownPoints !== undefined && ownPoints !== user.points)
      onPointsChange(ownPoints);
    return nextOverview;
  }, [loadOverview, onPointsChange, user.points]);
  useEffect(() => {
    let alive = true;
    const participationRequest = gameApi.currentParticipation();
    const overviewRequest = loadOverview();
    const runRequest = loadLiveRun();
    void overviewRequest
      .then((nextOverview) => {
        if (!alive) return;
        setOverview(nextOverview);
        const ownPoints =
          nextOverview.current?.points ??
          nextOverview.individual.find((entry) => entry.isUser)?.points;
        if (ownPoints !== undefined && ownPoints !== user.points)
          onPointsChange(ownPoints);
      })
      .catch(() => undefined);
    void participationRequest
      .then((current) => {
        if (alive)
          setParticipation(
            (current as unknown as { participation?: Participation } | null)
              ?.participation ?? (current as unknown as Participation | null),
          );
      })
      .catch(() => undefined);
    void runRequest
      .then((run) => {
        if (alive) setLiveRun(run);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [loadLiveRun, loadOverview, onPointsChange, user.points]);
  useEffect(() => {
    if (!liveRun) return;
    if (["completed", "cancelled"].includes(liveRun.status)) {
      const awardedPoints = liveRun.points ?? 0;
      if (refreshedTerminalRunId.current !== liveRun.id) {
        refreshedTerminalRunId.current = liveRun.id;
        void refreshOverview().catch(() => undefined);
      }
      const timer = window.setTimeout(() => {
        setLiveRun(null);
        if (liveRun.status === "completed" && awardedPoints > 0) {
          setCelebration({
            points: awardedPoints,
            label: liveRun.gameName,
            durationMs: 3_000,
          });
        }
      }, 2_000);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setInterval(() => {
      void loadLiveRun(liveRun.id).then((nextRun) => {
        setLiveRun(nextRun);
      });
    }, LIVE_RUN_POLL_MS);
    return () => window.clearInterval(timer);
  }, [liveRun, loadLiveRun, overview, refreshOverview, user.points]);
  const groups = showAll
    ? (overview?.groups ?? [])
    : (overview?.groups ?? []).slice(0, 10);
  const individual = showAll
    ? (overview?.individual ?? [])
    : (overview?.individual ?? []).slice(0, 30);
  const currentGroup = useMemo(
    () =>
      overview?.groups.find((group) => group.id === overview.current.groupId),
    [overview],
  );
  const closeOnboarding = () => {
    try {
      localStorage.setItem(onboardingKey(user.email), "1");
    } catch {}
    setOnboarding(false);
  };
  const openScanner = () => {
    if (!isOnline) {
      setScanFeedback(
        "Você está offline. Conecte-se à internet para escanear o QR Code.",
      );
      return;
    }
    setScanFeedback("");
    setQrOpen(true);
  };
  const handleQr = async (value: QrValidation) => {
    setParticipation(value);
    setQrOpen(false);
    onPointsChange(value.newTotalPoints ?? user.points + value.checkInPoints);
    if (value.activityKind === "competitive") {
      const run = await loadLiveRun();
      if (run) setLiveRun(run);
      return;
    }
    if (value.activityKind === "challenge") {
      setMomentOpen(true);
      return;
    }
    if (value.qrAction === "scored")
      setCelebration({ ...value, checkInPoints: value.qrPoints });
    else if (value.activityKind === "checkpoint" || value.activityKind === "live" || value.activityKind === "schedule")
      setCelebration({ ...value, alreadyRegistered: true });
  };
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        background: "var(--background)",
        paddingBottom: "var(--main-content-bottom-padding)",
        ...anim(animDir),
      }}
    >
      <header
        className="px-5 pb-4"
        style={{
          background: "var(--background)",
          paddingTop: "calc(var(--participant-header-height) + 0px + var(--safe-area-top))",
        }}
      >
        <div className="relative mt-4 flex items-center justify-center">
          <img
            src={(theme === "light" ? gameLogoLight : gameLogoDark).src}
            alt="DNJ Game"
            className="h-auto w-36"
          />
          <button
            type="button"
            onClick={() => setPointsInfoOpen(true)}
            className="absolute right-0 flex h-9 items-center gap-1 rounded-full px-3 text-xs font-black text-white"
            style={{ background: "var(--primary)" }}
            aria-label="Regras do DNJ Game"
          >
            <Info size={16} /> Regras
          </button>
        </div>
        <div
          className="mt-4 flex rounded-xl p-1"
          style={{ background: "var(--muted)" }}
        >
          {(["overview", "ranking"] as GameTab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className="flex-1 rounded-lg py-2 text-sm font-bold"
              style={{
                background: tab === item ? "var(--game)" : "transparent",
                color: tab === item ? "white" : "var(--muted-foreground)",
              }}
            >
              {item === "overview" ? "Meus Pontos" : "Ranking"}
            </button>
          ))}
        </div>
      </header>
      <main className="relative z-10 flex-1 overflow-y-auto px-5 py-5">
        {tab === "overview" ? (
          <div className="flex flex-col gap-4">
            <section className={`${participantStyles.journey} z-10`} style={{ marginTop: "-4px" }} aria-label="Minha jornada">
              <ol className={participantStyles.trail} aria-label="Etapas da jornada">
                {DNJ_LEVELS.map((stage, index) => {
                  const reached = user.points >= stage.minPoints;
                  const current = stage.name === level.name;
                  const Icon = reached ? levelIcons[index] : LockKeyhole;
                  return <li key={stage.name} className={`${participantStyles.step} ${reached ? participantStyles.done : ""} ${current ? participantStyles.current : ""}`} aria-current={current ? "step" : undefined} aria-label={`${stage.name}: ${current ? "nível atual" : reached ? "alcançado" : `bloqueado, ${stage.minPoints} pontos`}`}><span className={participantStyles.node}><Icon size={22} aria-hidden="true" /></span><strong>{stage.name}</strong></li>;
                })}
              </ol>
              <div className={participantStyles.progressRow}><progress aria-label="Progresso da jornada" max={100} value={level.progress} /><span>{level.nextPoints ? `${user.points} / ${level.nextPoints} pts` : `${user.points} pts`}</span></div>
              <p className={participantStyles.progressCaption}>Nível {level.name} · {level.nextPoints ? `faltam ${level.pointsToNext} pontos para a próxima etapa` : "Você completou todas as etapas!"}</p>
            </section>
            {momentChallenge &&
            momentChallenge.id !== completedMomentChallengeId ? (
              <MomentChallengeCard
                challenge={momentChallenge}
                onOpen={() => setMomentOpen(true)}
              />
            ) : null}
            <section>
              <h2 className="mb-2 text-sm font-bold">Histórico de pontos</h2>
              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                {overview?.pointEntries.length ? (
                  overview.pointEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <PointIcon type={entry.icon} />
                      <span className="flex-1 text-sm">{entry.label}</span>
                      <strong style={{ color: "var(--game)" }}>
                        {entry.points >= 0 ? "+" : ""}
                        {entry.points}
                      </strong>
                    </div>
                  ))
                ) : (
                  <p
                    className="px-4 py-5 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Ainda não há pontos registrados.
                  </p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {(["individual", "grupos"] as RankingTab[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setRankingTab(item);
                    setShowAll(false);
                  }}
                  className="flex-1 rounded-xl py-2 text-sm font-bold"
                  style={{
                    background:
                      rankingTab === item ? "var(--game)" : "var(--card)",
                    color:
                      rankingTab === item ? "white" : "var(--muted-foreground)",
                  }}
                >
                  {item === "individual" ? "Individual" : "Grupos"}
                </button>
              ))}
            </div>
            {rankingTab === "individual" ? (
              <>
                <Podium entries={individual} />
                <div
                  className="rounded-2xl p-4"
                  style={{ background: "var(--primary-alpha-10)" }}
                >
                  <strong>
                    Sua posição: #
                    {overview?.current.rankPosition ?? user.rankPosition}
                  </strong>
                  <span className="float-right">{user.points} pts</span>
                </div>
                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {individual.slice(3).map((entry, index) => (
                    <RankingRow
                      key={entry.id}
                      item={entry}
                      position={index + 4}
                      current={entry.isUser}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <section
                  className="rounded-2xl p-4"
                  style={{ background: "var(--primary-alpha-10)" }}
                >
                  <strong>Seu grupo</strong>
                  <span className="float-right">
                    {currentGroup
                      ? `#${(overview?.groups.findIndex((group) => group.id === currentGroup.id) ?? 0) + 1}`
                      : "Sem grupo"}
                  </span>
                </section>
                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {groups.map((entry, index) => (
                    <RankingRow
                      key={entry.id}
                      item={entry}
                      position={index + 1}
                      group
                      current={entry.id === currentGroup?.id}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              className="py-3 text-sm font-bold"
              style={{ color: "var(--game)" }}
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? "Ver menos" : "Ver ranking completo"}
            </button>
          </div>
        )}
      </main>
      {scanFeedback && (
        <p
          role="alert"
          className="px-5 text-sm"
          style={{ color: "var(--destructive)" }}
        >
          {scanFeedback}
        </p>
      )}
      {!onboarding && (
        <button
          onClick={openScanner}
          className="absolute bottom-24 right-5 z-20 grid h-14 w-14 place-items-center rounded-full text-white"
          style={{
            background: "var(--primary)",
            boxShadow: "var(--shadow-card)",
          }}
          aria-label="Escanear QR Code"
        >
          <QrCode />
        </button>
      )}
      {pointsInfoOpen && (
        <div
          className="absolute inset-0 z-30 flex items-end bg-black/40"
          role="presentation"
          onClick={() => setPointsInfoOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="points-info-title"
            className="w-full rounded-t-3xl p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] shadow-2xl"
            style={{ background: "var(--card)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: "var(--game)" }}>DNJ Game</p>
                <h2 id="points-info-title" className="mt-1 text-xl font-black">Regras do DNJ Game</h2>
              </div>
              <button type="button" onClick={() => setPointsInfoOpen(false)} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--muted)" }} aria-label="Fechar informações">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><QrCode size={20} /></span>
                <p className="min-w-0 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  <strong className="flex items-center gap-2 text-[var(--foreground)]">Escanear QR Code <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: "var(--primary)" }}>Pontua</span></strong>
                  <span className="mt-1 block">Check-in, espaços, atividades dinâmicas e desafios especiais.</span>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><Camera size={20} /></span>
                <p className="min-w-0 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  <strong className="flex items-center gap-2 text-[var(--foreground)]">Desafio Momento <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: "var(--primary)" }}>Pontua</span></strong>
                  <span className="mt-1 block">Durante o dia você receberá uma notificação para tirar uma foto em algum lugar, com alguma pessoa, e ganhará pontos!</span>
                </p>
              </div>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><MonitorPlay size={20} /></span>
                <p className="min-w-0 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  <strong className="flex items-center gap-2 text-[var(--foreground)]">Desafios especiais <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: "var(--primary)" }}>Vale mais</span></strong>
                  <span className="mt-1 block">Fique esperto com as TVs e telões: a qualquer momento podem surgir desafios, e o QR Code vale muitos pontos!</span>
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
      <AnimatePresence>
        {onboarding && (
          <Onboarding
            onClose={closeOnboarding}
            onScan={() => {
              closeOnboarding();
              openScanner();
            }}
          />
        )}
        {qrOpen && (
          <QrScannerModal
            onClose={() => setQrOpen(false)}
            onValidated={handleQr}
          />
        )}
        {celebration && (
          <QrSuccessCelebration
            points={
              "points" in celebration
                ? celebration.points
                : celebration.checkInPoints
            }
            scored={
              "points" in celebration || celebration.qrAction === "scored"
            }
            alreadyRegistered={
              "alreadyRegistered" in celebration && celebration.alreadyRegistered === true
            }
            durationMs={
              "points" in celebration
                ? celebration.durationMs
                : "alreadyRegistered" in celebration && celebration.alreadyRegistered
                  ? 1_600
                  : undefined
            }
            label={
              "points" in celebration
                ? celebration.label
                : celebration.activity?.name && celebration.place?.name
                  ? `${celebration.activity.name} · ${celebration.place.name}`
                  : "Participação confirmada"
            }
            onDone={() => setCelebration(null)}
          />
        )}
        {liveRun && <LiveRunOverlay run={liveRun} />}
      </AnimatePresence>
      {momentOpen && (
        <MomentComposer
          mode="challenge"
          onClose={() => setMomentOpen(false)}
          onCreated={(moment) => {
            setMomentOpen(false);
            if (moment.pointsAwarded > 0) {
              setCompletedMomentChallengeId(
                momentChallenge?.id ?? participation?.activity?.id ?? null,
              );
              if (momentChallenge) onMomentCompleted?.(momentChallenge.id);
              setCelebration({
                points: moment.pointsAwarded,
                label: "Desafio Momento DNJ",
              });
              onPointsChange(user.points + moment.pointsAwarded);
            }
            void refreshOverview();
          }}
        />
      )}
    </div>
  );
}
