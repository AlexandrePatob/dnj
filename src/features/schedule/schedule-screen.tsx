"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, MapPin, Radio } from "lucide-react";
import type { AnimDir } from "@/features/app/types";
import { scheduleApi, type ScheduleItem } from "@/lib/api/schedule";

const spaces = [
  { slugs: ["espaco-juventude", "palco-principal", "palco-juventude"], name: "Palco Principal" },
  { slugs: ["espaco-santidade"], name: "Espaço Santidade" },
  { slugs: ["espaco-radicalidade"], name: "Espaço Radicalidade" },
  { slugs: ["espaco-meditativo"], name: "Espaço Meditativo" },
] as const;

function formatTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }
function byTime(left: ScheduleItem, right: ScheduleItem) { return left.startsAt.localeCompare(right.startsAt); }
function spaceName(item: ScheduleItem) { return spaces.find((space) => space.slugs.includes(item.sector?.slug as never))?.name ?? item.sector?.name ?? "Espaço a confirmar"; }

function Activity({ item, showSpace = false }: { item: ScheduleItem; showSpace?: boolean }) {
  const live = item.state === "live";
  return <article className="py-3 first:pt-0 last:pb-0"><p className="flex items-center gap-1 text-xs font-bold" style={{ color: live ? "var(--primary)" : "var(--muted-foreground)" }}>{live ? <><Radio size={13} /> ACONTECENDO AGORA</> : <>{formatTime(item.startsAt)}–{formatTime(item.endsAt)}{item.state === "upcoming" ? " · EM BREVE" : item.state === "ended" ? " · ENCERRADO" : ""}</>}</p><h2 className="mt-1 font-black">{item.title}</h2>{item.description ? <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}{showSpace ? <p className="mt-2 flex items-center gap-1 text-xs font-bold" style={{ color: "var(--muted-foreground)" }}><MapPin size={13} />{spaceName(item)}</p> : null}</article>;
}

export function EventScheduleScreen({ onBack }: { animDir: AnimDir; onBack: () => void }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [tab, setTab] = useState<"now" | "spaces">("now");

  useEffect(() => { let active = true; scheduleApi.list().then((response) => { if (active) { setItems(response.items); setStatus("ready"); } }).catch(() => active && setStatus("error")); return () => { active = false; }; }, []);

  const relevant = items.filter((item) => item.state === "live" || item.state === "upcoming").sort(byTime);
  const knownGroups = spaces.map((space) => ({ name: space.name, activities: items.filter((item) => space.slugs.includes(item.sector?.slug as never)).sort(byTime) }));
  const knownActivityIds = new Set(knownGroups.flatMap((group) => group.activities.map((item) => item.id)));
  const otherGroups = Array.from(new Map(items.filter((item) => item.sector && !knownActivityIds.has(item.id)).sort(byTime).map((item) => [item.sector!.slug, { name: item.sector!.name, activities: items.filter((candidate) => candidate.sector?.slug === item.sector!.slug).sort(byTime) }])).values());
  const spaceGroups = [...knownGroups, ...otherGroups];
  return <main className="absolute inset-0 overflow-y-auto px-5 pb-[calc(var(--bottom-nav-total-height)+1rem)]" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))" }}>
    <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
    <h1 className="mt-4 text-2xl font-black">Programação completa</h1>
    <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Acompanhe o que acontece no DNJ 2K26.</p>
    <div role="tablist" aria-label="Visualização da programação" className="mt-5 grid grid-cols-2 rounded-2xl p-1" style={{ background: "var(--muted)" }}><button type="button" role="tab" aria-selected={tab === "now"} onClick={() => setTab("now")} className="rounded-xl py-2.5 text-sm font-black" style={{ background: tab === "now" ? "var(--card)" : "transparent", color: tab === "now" ? "var(--primary)" : "var(--muted-foreground)", boxShadow: tab === "now" ? "var(--shadow-card)" : undefined }}>Agora</button><button type="button" role="tab" aria-selected={tab === "spaces"} onClick={() => setTab("spaces")} className="rounded-xl py-2.5 text-sm font-black" style={{ background: tab === "spaces" ? "var(--card)" : "transparent", color: tab === "spaces" ? "var(--primary)" : "var(--muted-foreground)", boxShadow: tab === "spaces" ? "var(--shadow-card)" : undefined }}>Espaços</button></div>
    {status === "loading" ? <p className="py-10 text-center text-sm">Carregando programação...</p> : null}
    {status === "error" ? <p className="py-10 text-center text-sm" style={{ color: "var(--destructive)" }}>Não foi possível carregar a programação.</p> : null}
    {status === "ready" && tab === "now" ? <section className="mt-5 rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>{relevant.length ? relevant.map((item) => <Activity key={item.id} item={item} showSpace />) : <p className="py-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Não há atividades acontecendo agora.</p>}</section> : null}
    {status === "ready" && tab === "spaces" ? <section className="mt-5 flex flex-col gap-3">{spaceGroups.map((group, index) => <details key={group.name} open={index === 0 || group.activities.some((item) => item.state === "live")} className="rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black"><span className="flex items-center gap-2"><MapPin size={17} style={{ color: "var(--primary)" }} />{group.name}</span><ChevronDown size={18} style={{ color: "var(--muted-foreground)" }} /></summary><div className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>{group.activities.length ? group.activities.map((item) => <Activity key={item.id} item={item} />) : <p className="py-4 text-sm" style={{ color: "var(--muted-foreground)" }}>Nenhuma atividade programada neste espaço.</p>}</div></details>)}</section> : null}
  </main>;
}
