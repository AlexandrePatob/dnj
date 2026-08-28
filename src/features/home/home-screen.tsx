"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronRight, MapPin, Trophy } from "lucide-react";
import type { AnimDir, UserData } from "@/features/app/types";
import { getDnjLevel } from "@/lib/levels";
import { scheduleApi, type ScheduleItem } from "@/lib/api/schedule";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function HomeScreen({ user, animDir, onOpenSchedule, onOpenMap }: { user: UserData; animDir: AnimDir; onOpenSchedule: () => void; onOpenMap: () => void }) {
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
    <header className="px-5 pb-5" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(56px + var(--safe-area-top))" }}>
      <div className="relative overflow-hidden rounded-3xl p-5 text-white" style={{ background: "linear-gradient(135deg, var(--primary), #f18b31)", boxShadow: "var(--shadow-card)" }}>
        <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full border-[18px] border-white/15" />
        <div className="relative flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.14em] text-white/80">Jornada DNJ</p><h1 className="mt-1 text-2xl font-black">Olá, {user.name.split(" ")[0]}!</h1><p className="mt-1 text-sm text-white/90">Sua missão no DNJ começa agora.</p></div><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Trophy size={24} /></span></div>
        <div className="relative mt-5 flex items-center gap-3"><div aria-label="Progresso da jornada" className="h-2 flex-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{ width: `${Math.max(12, level.progress)}%` }} /></div><span className="text-xs font-black">Nível {level.name}</span></div>
      </div>
    </header>

    <main className="flex flex-col gap-5 px-5 py-5">
      <section className="rounded-3xl border p-4" style={{ background: "var(--card)", borderColor: "var(--primary-alpha-30)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><Calendar size={17} /></span><p className="text-sm font-black" style={{ color: "var(--primary)" }}>Acontecendo agora</p></div>
        {agendaState === "loading" ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando programação...</p> : null}
        {agendaState === "error" ? <p className="py-6 text-center text-sm" style={{ color: "var(--destructive)" }}>Não foi possível carregar a programação.</p> : null}
        {agendaState === "ready" && !liveItems.length ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Não há atividades acontecendo agora.</p> : null}
        {agendaState === "ready" && liveItems.length ? <div className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>{liveItems.map((item) => <article key={item.id} className="flex gap-3 rounded-xl py-3 first:pt-1" style={{ background: "var(--primary-alpha-10)" }}><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--primary)" }} /><div className="min-w-0 flex-1"><p className="text-[.65rem] font-black" style={{ color: "var(--primary)" }}>ACONTECENDO AGORA</p><h2 className="mt-1 text-sm font-black">{item.title}</h2>{item.description ? <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}<p className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}><MapPin size={12} />{item.sector?.name ?? "Espaço a confirmar"} · {formatTime(item.startsAt)}</p></div></article>)}</div> : null}
        <button type="button" onClick={onOpenSchedule} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-3 text-sm font-bold" style={{ background: "var(--primary)", color: "white" }}>Ver cronograma completo <ChevronRight size={16} /></button>
      </section>

      <section className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><MapPin size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-bold">Mapa do evento</h2><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Consulte o mapa oficial do DNJ.</p></div><button type="button" onClick={onOpenMap} className="shrink-0 text-sm font-bold" style={{ color: "var(--primary)" }}>Abrir</button></div></section>
    </main>
  </div>;
}
