"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { BrandSticker } from "@/components/brand/brand-sticker";
import { env } from "@/lib/env";
import { toDataURL } from "qrcode";

const DISPLAY_POLL_MS = 15_000;

export type DisplayTarget = "tv" | "screen";
export type ScreenFormat = "side" | "backdrop";

type RankingEntry = {
  id: string;
  name: string;
  points: number;
  group?: string;
  members?: number;
};
type SpecialEvent = {
  id: string;
  title: string;
  status: "teaser" | "active";
  points: number;
  teaserStartedAt?: string | null;
  endsAt: string;
  readyAt: string | null;
  qrImageUrl: string | null;
  qrToken?: string | null;
};
type DisplayData = {
  updatedAt: string;
  rankings: { individual: RankingEntry[]; groups: RankingEntry[] };
  specialEvent: SpecialEvent | null;
};

type RankingPage = {
  data?: Array<{
    id: string | number;
    name: string;
    points: number;
    groupName?: string | null;
    members?: number;
  }>;
};

function rankingEntries(page: RankingPage, board: "individual" | "groups"): RankingEntry[] {
  return (page.data ?? []).map((entry) => ({
    id: String(entry.id),
    name: entry.name,
    points: entry.points,
    ...(board === "individual" ? { group: entry.groupName ?? "Sem grupo" } : { members: entry.members ?? 0 }),
  }));
}

function remaining(target: string, now: number) {
  const seconds = Math.max(
    0,
    Math.ceil((new Date(target).getTime() - now) / 1_000),
  );
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function RankRows({
  entries,
  board,
  format,
}: {
  entries: RankingEntry[];
  board: "individual" | "groups";
  format: "tv" | ScreenFormat;
}) {
  if (!entries.length)
    return (
      <p className="mt-12 text-center text-2xl text-white/60">
        Aguardando os primeiros pontos do DNJ.
      </p>
    );
  const isBackdrop = format === "backdrop";
  const isSide = format === "side";
  const podium = [
    { entry: entries[1], position: 2, tone: "#c7d2d9", height: isBackdrop ? "6rem" : "9rem" },
    { entry: entries[0], position: 1, tone: "#f6c945", height: isBackdrop ? "8rem" : "12rem" },
    { entry: entries[2], position: 3, tone: "#d9824c", height: isBackdrop ? "5rem" : "7rem" },
  ].filter(
    (
      place,
    ): place is {
      entry: RankingEntry;
      position: number;
      tone: string;
      height: string;
    } => Boolean(place.entry),
  );

  return (
    <div className={`mx-auto w-full ${isBackdrop ? "mt-5" : "mt-8 max-w-7xl"}`}>
      <section
        aria-label="Pódio"
        className={`mx-auto grid w-full grid-cols-3 items-end px-2 text-center ${
          isBackdrop
            ? "max-w-[1120px] gap-5"
            : isSide
              ? "max-w-5xl gap-5 md:gap-8"
              : "max-w-4xl gap-3 md:gap-6"
        }`}
      >
        {podium.map(({ entry, position, tone, height }) => (
          <article key={entry.id} className="min-w-0">
            <span
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[#123c31] shadow-lg md:h-16 md:w-16"
              style={{ borderColor: tone, color: tone }}
            >
              {position === 1 ? (
                <Crown size={30} strokeWidth={2.4} />
              ) : (
                <Medal size={27} strokeWidth={2.4} />
              )}
            </span>
            <h2 className={`truncate font-bold text-white ${isBackdrop ? "text-base md:text-2xl" : "text-lg md:text-3xl"}`}>
              {entry.name}
            </h2>
            <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/55 md:text-sm">
              {board === "individual"
                ? entry.group
                : `${entry.members ?? 0} participantes`}
            </p>
            <div
              className={`relative mt-3 flex flex-col justify-end overflow-hidden rounded-t-[2rem] border border-b-0 px-2 md:px-5 ${isBackdrop ? "pb-2 pt-3" : "pb-4 pt-5"}`}
              style={{
                minHeight: height,
                borderColor: `${tone}88`,
                background: `linear-gradient(180deg, ${tone}42, ${tone}12)`,
              }}
            >
              <span
                className="text-sm font-bold uppercase tracking-[0.16em]"
                style={{ color: tone }}
              >
                {position}º lugar
              </span>
              <strong className={`mt-1 font-bold text-white ${isBackdrop ? "text-xl md:text-3xl" : "text-2xl md:text-4xl"}`}>
                {entry.points}
                <small className="ml-1 text-xs text-white/55 md:text-sm">
                  PTS
                </small>
              </strong>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function SpecialEventOverlay({
  event,
  now,
}: {
  event: SpecialEvent;
  now: number;
}) {
  const teaserStartedAt = event.teaserStartedAt;
  const readyAt = event.readyAt ?? (teaserStartedAt
    ? new Date(new Date(teaserStartedAt).getTime() + 30_000).toISOString()
    : "");
  const teaser = event.status === "teaser" && readyAt !== "" && new Date(readyAt).getTime() > now;
  const countdown = teaser
    ? remaining(readyAt!, now)
    : remaining(event.endsAt, now);
  return (
    <section
      aria-live="assertive"
      className="absolute inset-0 z-10 flex min-h-screen items-center justify-center overflow-hidden bg-[#0b3028] px-8 text-center text-white"
    >
      <span
        aria-hidden
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#d7ef74]/20 blur-3xl"
      />
      <span
        aria-hidden
        className="absolute -right-20 bottom-0 h-[32rem] w-[32rem] rounded-full bg-[#f37822]/25 blur-3xl"
      />
      <div className="relative max-w-5xl">
        <p className="mb-8 text-lg font-bold uppercase tracking-[0.34em] text-[#d7ef74]">
          {teaser ? "Atenção, DNJ" : "Evento especial ao vivo"}
        </p>
        <h1 className="text-balance text-6xl font-bold leading-none tracking-[-0.06em] md:text-8xl">
          {event.title}
        </h1>
        {teaser ? (
          <>
            <p className="mt-8 text-2xl text-white/75 md:text-4xl">
              Prepare seu celular. O desafio vai começar.
            </p>
            <strong className="mt-8 block text-7xl tracking-[-0.06em] text-[#d7ef74] md:text-9xl">
              {countdown}
            </strong>
          </>
        ) : (
          <>
            <div className="mx-auto mt-8 flex max-w-4xl flex-col items-center gap-7 md:flex-row md:justify-center md:gap-12">
              {event.qrImageUrl ? (
                <img
                  src={event.qrImageUrl}
                  alt={`QR Code para ${event.title}`}
                  className="h-56 w-56 rounded-3xl bg-white p-3 shadow-2xl md:h-72 md:w-72"
                />
              ) : null}
              <div>
                <p className="text-2xl text-white/75 md:text-4xl">
                  Aponte a câmera para o QR Code.
                </p>
                <strong className="mt-6 inline-block rounded-full bg-[#d7ef74] px-8 py-4 text-3xl text-[#0b3028] md:text-5xl">
                  +{event.points} PONTOS
                </strong>
                <p className="mt-6 text-lg font-semibold uppercase tracking-[0.18em] text-white/55">
                  Encerra em {countdown}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function LiveRankingDisplay({
  target,
  screenFormat,
}: {
  target: DisplayTarget;
  screenFormat?: ScreenFormat;
}) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [board, setBoard] = useState<"individual" | "groups">("individual");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [individualResponse, groupsResponse, eventResponse] = await Promise.all([
          fetch(`${env.apiBaseUrl}/rankings?scope=individual&page=1`, { cache: "no-store" }),
          fetch(`${env.apiBaseUrl}/rankings?scope=groups&page=1`, { cache: "no-store" }),
          fetch(`${env.apiBaseUrl}/live-display?target=${target}`, { cache: "no-store" }),
        ]);
        if (![individualResponse, groupsResponse, eventResponse].every((response) => response.ok))
          throw new Error("display unavailable");
        const [individual, groups, raw] = await Promise.all([
          individualResponse.json() as Promise<RankingPage>,
          groupsResponse.json() as Promise<RankingPage>,
          eventResponse.json() as Promise<(SpecialEvent & { qrToken?: string | null }) | null>,
        ]);
        const next: DisplayData = {
          updatedAt: new Date().toISOString(),
          rankings: {
            individual: rankingEntries(individual, "individual"),
            groups: rankingEntries(groups, "groups"),
          },
          specialEvent: raw
            ? {
                ...raw,
                qrImageUrl:
                  raw.qrImageUrl ??
                  (raw.qrToken
                    ? await toDataURL(raw.qrToken, { width: 360, margin: 1 })
                    : null),
              }
            : null,
        };
        if (mounted) {
          setData(next);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), DISPLAY_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, [target]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (data?.specialEvent) return;
    const rotation = window.setInterval(
      () =>
        setBoard((value) => (value === "individual" ? "groups" : "individual")),
      12_000,
    );
    return () => window.clearInterval(rotation);
  }, [data?.specialEvent]);

  const entries = useMemo(() => data?.rankings[board] ?? [], [board, data]);
  const title =
    board === "individual" ? "Ranking individual" : "Ranking dos grupos";
  const format = target === "tv" ? "tv" : screenFormat ?? "side";
  const isBackdrop = format === "backdrop";
  const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#031c16] text-white ${
        format === "side"
          ? "mx-auto max-w-[1440px] px-8 py-10 md:px-14"
          : isBackdrop
            ? "px-10 py-8 md:px-20"
            : "px-8 py-10 md:px-14"
      }`}
      style={format === "side" ? { aspectRatio: "3 / 4" } : isBackdrop ? { aspectRatio: "5 / 2" } : undefined}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_18%_12%,#0e654a_0,transparent_29%),radial-gradient(circle_at_86%_92%,#0b553f_0,transparent_36%),linear-gradient(118deg,transparent_0_28%,#0a392c_28%_34%,transparent_34%_58%,#0a382b_58%_65%,transparent_65%)]" />
      <span aria-hidden className="pointer-events-none absolute -left-16 bottom-[-4%] h-[34%] w-[32%] rotate-[-12deg] bg-[#07140f] opacity-80 [clip-path:polygon(0_16%,100%_0,76%_100%,0_100%)]" />
      <span aria-hidden className="pointer-events-none absolute -right-16 top-[28%] h-[45%] w-[28%] rotate-[14deg] bg-[#0c4b36] opacity-70 [clip-path:polygon(30%_0,100%_12%,78%_100%,0_80%)]" />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#f37822] via-[#d7ef74] to-[#f37822]"
      />
      {data?.specialEvent ? (
        <SpecialEventOverlay event={data.specialEvent} now={now} />
      ) : null}
      <header className={`relative z-0 mx-auto flex items-center justify-between gap-8 ${isBackdrop ? "max-w-none pb-4" : "max-w-7xl pb-6"}`}>
        <BrandSticker
          decorative
          variant="header"
          className="h-16 max-w-[10rem]"
        />
        <div className="flex items-center gap-5 text-right">
          <span className="hidden h-3 w-3 rounded-full bg-[#f3f51b] shadow-[0_0_18px_#f3f51b] sm:block" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/90">DNJ Game ao vivo</p>
            <p className="sr-only">{target === "tv" ? "TV" : isBackdrop ? "Telão · Fundo" : "Telão · Lateral"}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{clock}</p>
          </div>
        </div>
      </header>
      <section
        className={`relative z-0 mx-auto ${isBackdrop ? "max-w-none py-6" : "max-w-7xl py-12"}`}
        aria-live="polite"
      >
        <p className="text-center text-sm font-bold uppercase tracking-[0.42em] text-white/90">
          DNJ 2K26
        </p>
        <h1 className={`mt-2 flex items-center justify-center gap-4 text-center font-bold tracking-[-0.06em] ${isBackdrop ? "text-4xl md:text-6xl" : "text-5xl md:text-7xl"}`}>
          <Trophy
            aria-hidden
            className="hidden text-[#f6c945] md:block"
            size={52}
          />
          {title}
        </h1>
        <div className="mx-auto mt-3 h-1 w-28 rounded-full bg-[#f3f51b] shadow-[0_0_16px_#f3f51b]" />
        {data ? (
          <RankRows entries={entries} board={board} format={format} />
        ) : (
          <p className="mt-12 text-center text-2xl text-white/60">
            Carregando placar ao vivo…
          </p>
        )}
        {error ? (
          <p className="mt-6 text-center text-sm text-white/50">
            Tentando reconectar ao placar…
          </p>
        ) : null}
      </section>
      <footer className={`relative z-0 mx-auto mt-auto flex items-center justify-between border-t border-white/15 pt-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/60 ${isBackdrop ? "max-w-none" : "max-w-7xl"}`}>
        <span>Mais que pontos</span>
        <span className="text-[#f3f51b]">Uma geração para Deus</span>
      </footer>
    </main>
  );
}
