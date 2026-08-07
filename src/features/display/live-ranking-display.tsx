"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { BrandSticker } from "@/components/brand/brand-sticker";

export type DisplayTarget = "tv" | "screen";

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
  endsAt: string;
  readyAt: string | null;
  qrImageUrl: string | null;
};
type DisplayData = {
  updatedAt: string;
  rankings: { individual: RankingEntry[]; groups: RankingEntry[] };
  specialEvent: SpecialEvent | null;
};

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
}: {
  entries: RankingEntry[];
  board: "individual" | "groups";
}) {
  if (!entries.length)
    return (
      <p className="mt-12 text-center text-2xl text-white/60">
        Aguardando os primeiros pontos do DNJ.
      </p>
    );
  const podium = [
    { entry: entries[1], position: 2, tone: "#c7d2d9", height: "9rem" },
    { entry: entries[0], position: 1, tone: "#f6c945", height: "12rem" },
    { entry: entries[2], position: 3, tone: "#d9824c", height: "7rem" },
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
    <div className="mx-auto mt-8 w-full max-w-7xl">
      <section
        aria-label="Pódio"
        className="mx-auto grid max-w-4xl grid-cols-3 items-end gap-3 px-2 text-center md:gap-6"
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
            <h2 className="truncate text-lg font-bold text-white md:text-3xl">
              {entry.name}
            </h2>
            <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/55 md:text-sm">
              {board === "individual"
                ? entry.group
                : `${entry.members ?? 0} participantes`}
            </p>
            <div
              className="mt-3 flex flex-col justify-end rounded-t-[2rem] border border-b-0 px-2 pb-4 pt-5 md:px-5"
              style={{
                minHeight: height,
                borderColor: `${tone}88`,
                background: `linear-gradient(180deg, ${tone}40, ${tone}16)`,
              }}
            >
              <span
                className="text-sm font-bold uppercase tracking-[0.16em]"
                style={{ color: tone }}
              >
                {position}º lugar
              </span>
              <strong className="mt-1 text-2xl font-bold text-white md:text-4xl">
                {entry.points}
                <small className="ml-1 text-xs text-white/55 md:text-sm">
                  PTS
                </small>
              </strong>
            </div>
          </article>
        ))}
      </section>
      {entries.length > 3 ? (
        <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {entries.slice(3, 8).map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
            >
              <strong className="text-xl text-[#d7ef74]">{index + 4}º</strong>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-base text-white">
                  {entry.name}
                </b>
                <small className="block truncate text-xs text-white/55">
                  {board === "individual"
                    ? entry.group
                    : `${entry.members ?? 0} participantes`}
                </small>
              </span>
              <strong className="text-lg text-[#d7ef74]">{entry.points}</strong>
            </li>
          ))}
        </ol>
      ) : null}
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
  const teaser =
    event.status === "teaser" &&
    event.readyAt &&
    new Date(event.readyAt).getTime() > now;
  const countdown = teaser
    ? remaining(event.readyAt!, now)
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

export function LiveRankingDisplay({ target }: { target: DisplayTarget }) {
  const [data, setData] = useState<DisplayData | null>(null);
  const [board, setBoard] = useState<"individual" | "groups">("individual");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/display?target=${target}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("display unavailable");
        const next = (await response.json()) as DisplayData;
        if (mounted) {
          setData(next);
          setError(false);
        }
      } catch {
        if (mounted) setError(true);
      }
    };
    void load();
    const poll = window.setInterval(() => void load(), 5_000);
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b3028] px-8 py-10 text-white md:px-14">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#f37822] via-[#d7ef74] to-[#f37822]"
      />
      {data?.specialEvent ? (
        <SpecialEventOverlay event={data.specialEvent} now={now} />
      ) : null}
      <header className="relative z-0 mx-auto flex max-w-7xl items-center justify-between gap-8 border-b border-white/15 pb-7">
        <BrandSticker
          decorative
          variant="header"
          className="h-14 max-w-[9rem]"
        />
        <div className="text-right">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#d7ef74]">
            DNJ Game ao vivo
          </p>
          <p className="mt-1 text-lg text-white/65">
            {target === "tv" ? "TV" : "Telão"}
          </p>
        </div>
      </header>
      <section
        className="relative z-0 mx-auto max-w-7xl py-12"
        aria-live="polite"
      >
        <p className="text-center text-sm font-bold uppercase tracking-[0.28em] text-[#d7ef74]">
          DNJ 2K26
        </p>
        <h1 className="mt-3 flex items-center justify-center gap-4 text-center text-5xl font-bold tracking-[-0.06em] md:text-7xl">
          <Trophy
            aria-hidden
            className="hidden text-[#f6c945] md:block"
            size={52}
          />
          {title}
        </h1>
        {data ? (
          <RankRows entries={entries} board={board} />
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
    </main>
  );
}
