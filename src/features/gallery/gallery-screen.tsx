"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import type { AnimDir } from "@/features/app/types";
import type { GalleryPage, Moment } from "@/types/experience";
import momentOne from "@/assets/testeAsset_1_4x.png";
import momentTwo from "@/assets/testeAsset_1_4x-3.png";

type GalleryTab = "public" | "mine";

function animStyle(dir: AnimDir): React.CSSProperties {
  const map: Record<AnimDir, string> = { right: "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both", left: "slideInLeft 280ms cubic-bezier(0.22,1,0.36,1) both", up: "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both" };
  return { animation: map[dir] };
}

const placeholders = [momentOne.src, momentTwo.src];

export function GalleryScreen({ animDir }: { animDir: AnimDir }) {
  const [tab, setTab] = useState<GalleryTab>("public");
  const [page, setPage] = useState<GalleryPage>({ items: [], nextCursor: null });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Moment | null>(null);
  async function shareSelected() {
    if (!selected) return;
    const text = `${selected.placeName} · DNJ Curitiba 2026`;
    if (navigator.share) {
      await navigator.share({ title: "DNJ Game", text });
      return;
    }
    const link = document.createElement("a");
    link.href = placeholders[0];
    link.download = "dnj-game-momento.png";
    link.click();
  }

  useEffect(() => {
    let cancelled = false;
    const url = tab === "public" ? "/api/mock/v1/gallery?eventId=event_dnj_curitiba_2026" : "/api/mock/v1/gallery/mine";
    void fetch(url, { headers: tab === "mine" ? { authorization: "Bearer mock" } : undefined })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((value: GalleryPage) => { if (!cancelled) setPage(value); })
      .catch(() => { if (!cancelled) setPage({ items: [], nextCursor: null }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  return <div className="absolute inset-0 overflow-y-auto" style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", ...animStyle(animDir) }}>
    <header className="px-5 pb-4" style={{ paddingTop: "calc(64px + var(--safe-area-top))", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
      <h1 className="text-2xl font-black" style={{ color: "var(--foreground)" }}>Galeria DNJ</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>MemÃ³rias que a juventude estÃ¡ criando.</p>
      <div className="mt-4 flex rounded-xl p-1" style={{ background: "var(--muted)" }}>
        {[{ id: "public" as const, label: "Galeria" }, { id: "mine" as const, label: "Meus registros" }].map((item) => <button key={item.id} type="button" onClick={() => { setLoading(true); setTab(item.id); }} className="flex-1 rounded-lg py-2 text-sm font-bold" style={{ background: tab === item.id ? "var(--primary)" : "transparent", color: tab === item.id ? "white" : "var(--muted-foreground)" }}>{item.label}</button>)}
      </div>
    </header>
    <main className="px-5 py-5">
      {loading ? <p className="py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Carregando registros...</p> : page.items.length === 0 ? <div className="py-14 text-center"><ImageIcon className="mx-auto mb-3" style={{ color: "var(--muted-foreground)" }} /><p className="font-bold">Nenhum registro ainda</p><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Participe de uma atividade para criar o primeiro.</p></div> : <div className="grid grid-cols-2 gap-3">{page.items.map((moment, index) => <button key={moment.id} type="button" onClick={() => setSelected(moment)} className="overflow-hidden rounded-2xl text-left" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><span className="relative block"><img src={placeholders[index % placeholders.length]} alt={`Momento em ${moment.placeName}`} className="aspect-square w-full object-cover" /><b className="absolute bottom-2 right-2 rounded-lg px-2 py-1 text-[0.6rem]" style={{ background: "rgba(0,0,0,.55)", color: "white" }}>DNJ GAME</b></span><div className="p-3"><p className="truncate text-sm font-bold">{moment.placeName}</p><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{moment.moderationStatus === "approved" ? "Publicado" : moment.moderationStatus === "pending" ? "Em moderaÃ§Ã£o" : "NÃ£o publicado"}</p></div></button>)}</div>}
    </main>
    {selected && <div className="absolute inset-0 z-50 flex flex-col justify-end p-5" style={{ background: "rgba(0,0,0,.7)" }}><div className="rounded-3xl p-5" style={{ background: "var(--card)" }}><img src={placeholders[0]} alt={`Momento em ${selected.placeName}`} className="mb-4 aspect-square w-full rounded-2xl object-cover" /><div className="flex items-start justify-between gap-4"><div><h2 className="font-black">{selected.placeName}</h2><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{selected.pointsAwarded} pontos Â· {selected.moderationStatus === "approved" ? "Aprovado" : "Em moderaÃ§Ã£o"}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar visualizaÃ§Ã£o"><X /></button></div><button type="button" onClick={() => void shareSelected()} className="mt-4 w-full rounded-xl py-3 text-sm font-bold" style={{ background: "var(--primary)", color: "white" }}>Compartilhar ou baixar</button></div></div>}
  </div>;
}
