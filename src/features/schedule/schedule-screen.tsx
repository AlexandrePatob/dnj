"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Radio } from "lucide-react";
import type { AnimDir } from "@/features/app/types";
import { scheduleApi, type ScheduleItem } from "@/lib/api/schedule";

function formatTime(value: string) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)); }

export function EventScheduleScreen({ animDir: _animDir, onBack }: { animDir: AnimDir; onBack: () => void }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  useEffect(() => { let active = true; scheduleApi.list().then((response) => { if (active) { setItems(response.items); setStatus("ready"); } }).catch(() => active && setStatus("error")); return () => { active = false; }; }, []);
  return <main className="absolute inset-0 overflow-y-auto px-5 pb-[calc(var(--bottom-nav-total-height)+1rem)]" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))" }}>
    <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
    <h1 className="mt-4 text-2xl font-black">Cronograma completo</h1>
    <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Programação oficial do DNJ 2K26. O que já passou continua aqui como referência.</p>
    {status === "loading" ? <p className="py-10 text-center text-sm">Carregando programação...</p> : null}
    {status === "error" ? <p className="py-10 text-center text-sm" style={{ color: "var(--destructive)" }}>Não foi possível carregar o cronograma.</p> : null}
    {status === "ready" ? items.map((item) => {
      const live = item.state === "live";
      return <section key={item.id} className="mt-4 rounded-2xl p-4" style={{ background: live ? "var(--primary-alpha-10)" : "var(--card)", border: `1px solid ${live ? "var(--primary)" : "var(--border)"}`, boxShadow: live ? "var(--shadow-card)" : undefined }}>
        <p className="flex items-center gap-1 text-xs font-bold" style={{ color: live ? "var(--primary)" : "var(--muted-foreground)" }}>{live ? <><Radio size={13} /> ACONTECENDO AGORA</> : <>{formatTime(item.startsAt)}–{formatTime(item.endsAt)} · {item.state === "upcoming" ? "EM 15 MIN" : item.state === "ended" ? "ENCERRADO" : item.sector?.name ?? "DNJ"}</>}</p>
        <h2 className="mt-2 font-black">{item.title}</h2>
        {item.description ? <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{item.description}</p> : null}
        <p className="mt-3 flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}><MapPin size={13} />{item.sector?.name ?? "Espaço a confirmar"} · {formatTime(item.startsAt)}–{formatTime(item.endsAt)}</p>
      </section>;
    }) : null}
  </main>;
}
