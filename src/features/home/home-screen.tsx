"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Calendar, ChevronRight, MapPin, Sprout, Footprints, BookOpen, Send, Hammer, Church, LockKeyhole } from "lucide-react";
import type { AnimDir, UserData } from "@/features/app/types";
import { DNJ_LEVELS, getDnjLevel } from "@/lib/levels";
import styles from "@/components/layout/participant.module.css";
import { ParticipantHeader } from "@/components/layout/participant-header";
import { scheduleApi, type ScheduleItem } from "@/lib/api/schedule";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatDuration(startsAt: string, endsAt: string) {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!remainingMinutes) return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  return `${hours} ${hours === 1 ? "hora" : "horas"} e ${remainingMinutes} minutos`;
}

const levelIcons = [Sprout, Footprints, BookOpen, Send, Hammer, Church];
export function HomeScreen({ user, animDir, onOpenSchedule, onOpenMap, onOpenGame, onOpenAccount, onOpenHome }: { user: UserData; animDir: AnimDir; onOpenSchedule: () => void; onOpenMap: () => void; onOpenGame: () => void; onOpenAccount: () => void; onOpenHome?: () => void }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [agendaState, setAgendaState] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let active = true;
    scheduleApi.list({ view: "home" }).then((response) => {
      if (active) { setItems(response.items); setAgendaState("ready"); }
    }).catch(() => active && setAgendaState("error"));
    return () => { active = false; };
  }, []);

  const liveItems = items.filter((item) => item.state === "live");
  const level = getDnjLevel(user.points);
  return <div key="home" className="absolute inset-0 overflow-y-auto" style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", animation: animDir === "left" ? "slideInLeft 280ms cubic-bezier(.22,1,.36,1) both" : "fadeUp 220ms cubic-bezier(.22,1,.36,1) both" }}>
    <div className={styles.hero}>
      <ParticipantHeader user={user} home onHome={onOpenHome} onAccount={onOpenAccount} onGame={onOpenGame} />
      <div className={styles.greeting}><h1>Olá, {user.name.trim().split(/\s+/)[0] || "participante"}!</h1><blockquote>“Não vos conformeis com esse mundo, mas renovai-vos”<cite>Romanos 12, 2</cite></blockquote></div>
    </div>
    <section className={styles.journey} aria-labelledby="journey-title" style={{ marginTop: "calc(-10.5% - 8px)" }}>
      <div className={styles.journeyHeading}><h2 id="journey-title">Minha jornada</h2><button type="button" onClick={onOpenGame} className={styles.evolution}>Ver evolução <ChevronRight size={17} aria-hidden="true" /></button></div>
      <ol className={styles.trail} aria-label="Etapas da jornada">{DNJ_LEVELS.map((stage, index) => {
        const reached = user.points >= stage.minPoints;
        const current = stage.name === level.name;
        const Icon = reached ? levelIcons[index] : LockKeyhole;
        return <li key={stage.name} className={`${styles.step} ${reached ? styles.done : ""} ${current ? styles.current : ""}`} aria-current={current ? "step" : undefined} aria-label={`${stage.name}: ${current ? "nível atual" : reached ? "alcançado" : `bloqueado, ${stage.minPoints} pontos`}`}><span className={styles.node}><Icon size={22} aria-hidden="true" /></span><strong>{stage.name}</strong></li>;
      })}</ol>
      <div className={styles.progressRow}><progress aria-label="Progresso da jornada" max={100} value={level.progress} /><span>{level.nextPoints ? `${user.points} / ${level.nextPoints} pts` : `${user.points} pts`}</span></div>
      <p className={styles.progressCaption}>Nível {level.name} · {level.nextPoints ? `faltam ${level.pointsToNext} pontos para a próxima etapa` : "Você completou todas as etapas!"}</p>
    </section>

    <main className="flex flex-col gap-5 px-5 py-5">
      <section className="rounded-3xl p-4" style={{ background: "var(--card)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><Calendar size={17} /></span><p className="text-sm font-black" style={{ color: "var(--primary)" }}>Acontecendo agora</p></div>
        {agendaState === "loading" ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando programação...</p> : null}
        {agendaState === "error" ? <p className="py-6 text-center text-sm" style={{ color: "var(--destructive)" }}>Não foi possível carregar a programação.</p> : null}
        {agendaState === "ready" && !liveItems.length ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Não há atividades acontecendo agora.</p> : null}
        {agendaState === "ready" && liveItems.length ? <div className="mt-3 grid gap-2">{liveItems.map((item) => <article key={item.id} className="flex min-w-0 gap-3 overflow-hidden rounded-xl px-3 py-3 shadow-sm" style={{ background: "var(--primary-alpha-10)" }}><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--primary)" }} /><div className="min-w-0 flex-1"><p className="flex min-w-0 items-center gap-1 truncate text-xs font-bold" style={{ color: "var(--muted-foreground)" }}><MapPin className="shrink-0" size={12} />{item.sector?.name ?? "Espaço a confirmar"}</p><h2 className="mt-1 truncate text-sm font-black">{item.title}</h2>{item.description ? <p className="mt-0.5 truncate text-xs" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}<p className="mt-2 truncate text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Início: {formatTime(item.startsAt)} · Duração: {formatDuration(item.startsAt, item.endsAt)}</p></div></article>)}</div> : null}
        <button type="button" onClick={onOpenSchedule} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-3 text-sm font-bold" style={{ background: "var(--primary)", color: "white" }}>Ver programação completa <ChevronRight size={16} /></button>
      </section>

      <section className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><MapPin size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-bold">Mapa do evento</h2><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Consulte o mapa oficial do DNJ.</p></div><button type="button" onClick={onOpenMap} className="shrink-0 text-sm font-bold" style={{ color: "var(--primary)" }}>Abrir</button></div></section>
      <section aria-label="Patrocinadores e parceiros" className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Image src="/images/patrocinadores-dnj.png" alt="Patrocinadores, apoiadores, media partner e parceiros do DNJ" width={1125} height={660} sizes="(max-width: 448px) calc(100vw - 40px), 408px" className="h-auto w-full" />
      </section>
    </main>
  </div>;
}
