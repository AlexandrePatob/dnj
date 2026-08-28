"use client";

import Image from "next/image";
import { ArrowLeft, X, ZoomIn } from "lucide-react";
import { useState } from "react";
import type { AnimDir } from "@/features/app/types";

export function EventMapScreen({ onBack }: { animDir: AnimDir; onBack: () => void }) {
const [expanded, setExpanded] = useState(false);
  const officialMap = "https://www.google.com/maps/d/u/3/viewer?mid=1aKENTfTvZsi_kiVcJ3UL8M8SLPbue8s&ll=-25.433037396381696%2C-49.35545419287244&z=18";

  return <main className="absolute inset-0 overflow-y-auto px-5 pb-28" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))" }}>
    <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>
    <h1 className="mt-4 text-2xl font-black">Mapa do evento</h1>
    <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Mapa oficial do DNJ 2K26.</p>
    <a href={officialMap} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--primary)" }}>Abrir no Google Maps</a>
    <section className="mt-5 overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <button type="button" onClick={() => setExpanded(true)} className="relative block w-full text-left" aria-label="Ampliar mapa oficial">
        <Image src="/images/mapa-isometrico-dnj.png" alt="Mapa isométrico oficial do evento DNJ 2026" width={4072} height={2168} sizes="(max-width: 640px) 100vw, 768px" className="aspect-[16/9] w-full object-contain" priority />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: "rgb(0 0 0 / .72)" }}><ZoomIn size={14} /> Ampliar</span>
      </button>
      <div className="p-4"><h2 className="font-black">Mapa Oficial</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Toque na imagem para ampliar.</p></div>
    </section>
    {expanded ? <div role="dialog" aria-modal="true" aria-label="Mapa oficial ampliado" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={() => setExpanded(false)}><section className="relative max-h-full max-w-6xl" onClick={(event) => event.stopPropagation()}><Image src="/images/mapa-isometrico-dnj.png" alt="Mapa isométrico oficial do evento DNJ 2026 ampliado" width={4072} height={2168} sizes="100vw" className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain" /><button type="button" onClick={() => setExpanded(false)} className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: "rgb(0 0 0 / .72)" }} aria-label="Fechar mapa ampliado"><X size={20} /></button></section></div> : null}
  </main>;
}
