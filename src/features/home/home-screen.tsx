"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import type { AnimDir, UserData } from "@/features/app/types";
import { getDnjLevel } from "@/lib/levels";
import { scheduleApi, type ScheduleItem } from "@/lib/api/schedule";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function HomeScreen({ user, animDir, onOpenSchedule, onOpenMap }: { user: UserData; animDir: AnimDir; onOpenSchedule: () => void; onOpenMap: () => void }) {
  const level = getDnjLevel(user.points);
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
  const nextItems = items.filter((item) => item.state !== "live");
  return <div key="home" className="absolute inset-0 overflow-y-auto" style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", animation: animDir === "left" ? "slideInLeft 280ms cubic-bezier(.22,1,.36,1) both" : "fadeUp 220ms cubic-bezier(.22,1,.36,1) both" }}>
    <header className="flex items-end justify-between gap-4 px-6 pb-5" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(56px + var(--safe-area-top))" }}>
      <div><p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>Olá, {user.name.split(" ")[0]}!</p><h1 className="mt-1 text-xl font-bold">Dia Nacional da Juventude</h1><p className="mt-0.5 text-sm" style={{ color: "var(--primary)" }}>Curitiba · 2026</p></div>
      <div className="shrink-0 rounded-2xl px-3 py-2 text-right" style={{ background: "var(--primary-alpha-10)", border: "1px solid var(--primary-alpha-20)" }}><p className="text-[.65rem] font-bold uppercase" style={{ color: "var(--primary)" }}>Nível {level.name}</p><p className="mt-0.5 text-xs font-semibold">{level.nextPoints ? `${user.points}/${level.nextPoints}` : user.points} Pontos</p></div>
    </header>

    <main className="flex flex-col gap-5 px-5 py-5">
      <section className="rounded-3xl border p-4" style={{ background: "var(--card)", borderColor: "var(--primary-alpha-30)", boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><Calendar size={17} /></span><p className="text-sm font-black" style={{ color: "var(--primary)" }}>{liveItems.length ? "Agora no DNJ" : "Próximos no DNJ"}</p></div>
        {agendaState === "loading" ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando programação...</p> : null}
        {agendaState === "error" ? <p className="py-6 text-center text-sm" style={{ color: "var(--destructive)" }}>Não foi possível carregar a programação.</p> : null}
        {agendaState === "ready" && !items.length ? <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Não há atividades programadas agora.</p> : null}
        {agendaState === "ready" && items.length ? <div className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>{liveItems.map((item) => <article key={item.id} className="flex gap-3 rounded-xl py-3 first:pt-1" style={{ background: "var(--primary-alpha-10)" }}><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--primary)" }} /><div className="min-w-0 flex-1"><p className="text-[.65rem] font-black" style={{ color: "var(--primary)" }}>ACONTECENDO AGORA</p><h2 className="mt-1 text-sm font-black">{item.title}</h2>{item.description ? <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}<p className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}><MapPin size={12} />{item.sector?.name ?? "Espaço a confirmar"} · {formatTime(item.startsAt)}</p></div></article>)}{liveItems.length && nextItems.length ? <p className="pt-3 text-[.65rem] font-black" style={{ color: "var(--muted-foreground)" }}>EM SEGUIDA</p> : null}{nextItems.map((item) => <article key={item.id} className="flex gap-3 py-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} /><div className="min-w-0 flex-1"><h2 className="text-sm font-black">{item.title}</h2>{item.description ? <p className="mt-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}<p className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}><MapPin size={12} />{item.sector?.name ?? "Espaço a confirmar"} · {formatTime(item.startsAt)}</p></div></article>)}</div> : null}
        <button type="button" onClick={onOpenSchedule} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-3 text-sm font-bold" style={{ background: "var(--primary)", color: "white" }}>Ver cronograma completo <ChevronRight size={16} /></button>
      </section>

      <section className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><MapPin size={20} /></span><div className="min-w-0 flex-1"><h2 className="font-bold">Mapa do evento</h2><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Encontre os espaços e a programação ao seu redor.</p></div><button type="button" onClick={onOpenMap} className="text-sm font-bold" style={{ color: "var(--primary)" }}>Abrir</button></div></section>
    </main>
  </div>;
}
