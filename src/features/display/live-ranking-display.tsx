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
  avatarUrl?: string;
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
    avatarUrl?: string | null;
    imageUrl?: string | null;
    photoUrl?: string | null;
  }>;
};

function rankingEntries(page: RankingPage, board: "individual" | "groups"): RankingEntry[] {
  return (page.data ?? []).map((entry) => ({
    id: String(entry.id),
    name: entry.name,
    points: entry.points,
    ...(board === "individual" ? { group: entry.groupName ?? "Sem grupo" } : { members: entry.members ?? 0 }),
    ...(entry.avatarUrl || entry.imageUrl || entry.photoUrl
      ? { avatarUrl: entry.avatarUrl ?? entry.imageUrl ?? entry.photoUrl ?? undefined }
      : {}),
  }));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

function BackdropRanking({ entries, board, clock }: { entries: RankingEntry[]; board: "individual" | "groups"; clock: string }) {
  const places = [entries[1], entries[0], entries[2]];
  const tones = ["#d9e0e2", "#f3f51b", "#ff9656"];

  return (
    <>
      <time className="absolute z-10 text-right text-[1.8vw] font-black tabular-nums text-white" style={{ right: "2.4%", top: "3.3%" }}>{clock}</time>
      <p
        className="absolute left-1/2 z-10 -translate-x-1/2 text-[.48vw] font-semibold uppercase tracking-[.22em] text-[#f3f51b]/90"
        style={{ top: "20.2%" }}
      >
        {board === "individual" ? "Individual" : "Grupo"}
      </p>
      <section aria-label="Pódio" className="absolute inset-x-0" style={{ top: "30.8%", height: "45.3%" }}>
        {places.map((entry, index) => {
          const center = index === 1;
          const left = [25.8, 42.2, 59.2][index];
          const width = center ? 15.9 : 15.4;
          const top = center ? 0 : 9.4;
          return (
            <article
              key={entry?.id ?? `empty-${index}`}
              className="absolute flex flex-col items-center rounded-[1.5vw] border-[.13vw] px-[1vw] pt-[1.7vw] text-center"
              style={{ left: `${left}%`, top: `${top}%`, zIndex: 1, width: `${width}%`, height: center ? "98%" : "84.2%", borderColor: tones[index], backgroundColor: center ? "#4d5414" : "#061d17", backgroundImage: center ? "linear-gradient(145deg,#4d5414,#061d17)" : "linear-gradient(145deg,#16342c,#061d17)", boxShadow: center ? "0 0 22px #f3f51b88" : undefined }}
            >
              {center ? <Crown aria-hidden className="absolute fill-[#f3f51b]/20 text-[#f3f51b]" style={{ top: "-3.15vw", height: "3.6vw", width: "3.6vw" }} strokeWidth={2.2} /> : null}
              <span className="absolute flex items-center justify-center rounded-full text-[1.35vw] font-black text-black" style={{ right: ".8vw", top: ".8vw", height: "2.8vw", width: "2.8vw", background: tones[index] }}>{index === 0 ? "2º" : center ? "1º" : "3º"}</span>
              <span className={`mt-[.1vw] flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[.18vw] bg-[#19372e] ${center ? "h-[7.8vw] w-[7.8vw]" : "h-[6.6vw] w-[6.6vw]"}`} style={{ borderColor: tones[index], boxShadow: `0 0 12px ${tones[index]}77` }}>
                {entry?.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={`Foto de ${entry.name}`} className="h-full w-full object-cover" />
                ) : entry ? (
                  <span className={`${center ? "text-[2.1vw]" : "text-[1.7vw]"} font-black`} style={{ color: tones[index] }}>{initials(entry.name)}</span>
                ) : (
                  <span aria-hidden />
                )}
              </span>
              <h2 className={`${center ? "mt-[.9vw] text-[1.35vw]" : "mt-[.75vw] text-[1.15vw]"} max-w-full truncate font-bold leading-tight text-white`}>{entry?.name}</h2>
              <div className={`${center ? "mt-[.7vw]" : "mt-[.55vw]"}`}>
                <strong className={`${center ? "text-[3vw]" : "text-[2.55vw]"} font-black leading-none tabular-nums`} style={{ color: center ? "#f3f51b" : "white" }}>{entry?.points}</strong>
                <small className="ml-[.35vw] text-[1vw] font-bold text-white">PTS</small>
              </div>
              {center && board === "individual" && entry ? <p className="mt-[.7vw] max-w-[90%] text-[.52vw] font-bold uppercase tracking-[.15em] text-white/80">{entry.group}</p> : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

function SideRanking({ entries, board, clock }: { entries: RankingEntry[]; board: "individual" | "groups"; clock: string }) {
  const places = [entries[1], entries[0], entries[2]];
  const tones = ["#d9e0e2", "#f3f51b", "#ff9656"];

  return <>
    <time className="absolute z-10 text-right font-black tabular-nums text-white" style={{ right: "5.4%", top: "3.35%", fontSize: "2.25cqw", backgroundColor: "#00271c", padding: ".45cqw .5cqw" }}>{clock}</time>
    <section aria-label="Pódio" className="absolute inset-x-0" style={{ top: "32.5%", height: "21.8%" }}>
      {places.map((entry, index) => {
        const center = index === 1;
        const tone = tones[index];
        const left = [7.3, 34.8, 65.8][index];
        const width = center ? 30.5 : 26.3;
        return (
          <article
            key={entry?.id ?? `empty-${index}`}
            className="absolute text-center"
            style={{ left: `${left}%`, top: center ? "0" : "7%", width: `${width}%`, height: center ? "100%" : "82%", border: ".16cqw solid", borderRadius: "1.7cqw", padding: "2cqw 1.15cqw 0", borderColor: tone, background: center ? "linear-gradient(145deg,#534f12,#062219)" : "linear-gradient(145deg,#1c392e,#062219)", boxShadow: center ? "0 0 22px #f3f51b88" : undefined }}
          >
            {center ? <Crown aria-hidden className="absolute fill-[#f3f51b]/20 text-[#f3f51b]" style={{ left: "50%", transform: "translateX(-50%)", top: "-2.6cqw", height: "3.5cqw", width: "3.5cqw" }} strokeWidth={2.2} /> : null}
            <span className="absolute flex items-center justify-center rounded-full font-black text-black" style={{ right: "7%", top: "7%", height: "3.3cqw", width: "3.3cqw", fontSize: "1.65cqw", background: tone }}>{index === 0 ? "2º" : center ? "1º" : "3º"}</span>
            <span className="absolute flex items-center justify-center overflow-hidden rounded-full bg-[#19372e]" style={{ left: "50%", top: "10%", transform: "translateX(-50%)", width: center ? "47%" : "50%", aspectRatio: "1 / 1", border: "2px solid", borderColor: tone, boxShadow: `0 0 12px ${tone}77` }}>
              {entry?.avatarUrl ? <img src={entry.avatarUrl} alt={`Foto de ${entry.name}`} className="h-full w-full object-cover" /> : entry ? <span className="font-black" style={{ fontSize: center ? "3.3cqw" : "2.8cqw", color: tone }}>{initials(entry.name)}</span> : <span aria-hidden />}
            </span>
            <h2 className="absolute left-[7%] right-[7%] truncate font-bold leading-tight text-white" style={{ top: center ? "59%" : "58%", fontSize: center ? "2.2cqw" : "1.85cqw" }}>{entry?.name}</h2>
            <div className="absolute inset-x-0" style={{ top: center ? "72%" : "71%" }}>
              <strong className="font-black leading-none tabular-nums" style={{ fontSize: center ? "5cqw" : "4.25cqw", color: center ? "#f3f51b" : "white" }}>{entry?.points}</strong>
              <small className="ml-[.45cqw] font-bold text-white" style={{ fontSize: "1.5cqw" }}>PTS</small>
            </div>
            {center && entry ? <p className="absolute inset-x-[7%] font-bold uppercase tracking-[.15em] text-white/80" style={{ top: "90%", fontSize: ".7cqw" }}>{board === "individual" ? entry.group : `${entry.members ?? 0} participantes`}</p> : null}
          </article>
        );
      })}
    </section>
  </>;
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
  const isStageScreen = target === "screen";
  const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);

  return (
    <main
      className={`relative overflow-hidden bg-[#031c16] text-white ${
        format === "side"
          ? "mx-auto"
          : isBackdrop
            ? "mx-auto"
            : "min-h-screen px-8 py-10 md:px-14"
      }`}
      style={{
        ...(format === "side" ? { aspectRatio: "3 / 4", width: "min(100vw, 75vh)", containerType: "inline-size", fontSize: "1cqw" } : isBackdrop ? { aspectRatio: "5 / 2", width: "min(100vw, 250vh)" } : {}),
        backgroundImage: `url(${isBackdrop ? "/telao-horizontal-ranking-live-v3.png" : format === "side" ? "/telao-vertical-ranking-live-v2.png" : "/telao-vertical-reference.png"})`,
        backgroundPosition: "center",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      {!isStageScreen ? <span aria-hidden className="pointer-events-none absolute inset-0 opacity-35 [background:radial-gradient(circle_at_18%_12%,#0e654a_0,transparent_29%),radial-gradient(circle_at_86%_92%,#0b553f_0,transparent_36%),linear-gradient(118deg,transparent_0_28%,#0a392c_28%_34%,transparent_34%_58%,#0a382b_58%_65%,transparent_65%)]" /> : null}
      {!isBackdrop ? <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#f37822] via-[#d7ef74] to-[#f37822]"
      /> : null}
      {data?.specialEvent ? (
        <SpecialEventOverlay event={data.specialEvent} now={now} />
      ) : null}
      {isStageScreen ? (isBackdrop ? <BackdropRanking entries={entries} board={board} clock={clock} /> : data ? <SideRanking entries={entries} board={board} clock={clock} /> : null) : <><header className="relative z-0 mx-auto flex max-w-7xl items-center justify-between gap-8 pb-6">
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
      </>}
    </main>
  );
}
