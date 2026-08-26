"use client";
import { ArrowLeft, MapPin } from "lucide-react";
import type { AnimDir } from "@/features/app/types";
import { useEffect, useState } from "react";

type ApiSpace = { id: string; name: string; slug: string; mapReference: string | null };
const officialMap = "https://www.google.com/maps/d/u/3/viewer?mid=1aKENTfTvZsi_kiVcJ3UL8M8SLPbue8s&ll=-25.433037396381696%2C-49.35545419287244&z=18";

export function EventMapScreen({ animDir: _animDir, onBack }: { animDir: AnimDir; onBack: () => void }) {
  const [spaces, setSpaces] = useState<ApiSpace[]>([]); const [selected, setSelected] = useState(0);
  useEffect(() => { let alive = true; fetch("/api/v1/spaces").then((response) => response.ok ? response.json() : []).then((items) => { if (alive) setSpaces(items); }).catch(() => undefined); return () => { alive = false; }; }, []);
  const space = spaces[selected];
  return <main className="absolute inset-0 overflow-y-auto px-5 pb-28" style={{ background: "var(--background)", paddingTop: "calc(64px + var(--safe-area-top))" }}><button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button><h1 className="mt-4 text-2xl font-black">Mapa do evento</h1><p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>Referência de espaços; confira atualizações durante o encontro.</p><a href={officialMap} target="_blank" rel="noreferrer" className="mt-4 block rounded-xl px-4 py-3 text-center text-sm font-bold text-white" style={{ background: "var(--primary)" }}>Abrir mapa oficial</a><div className="mt-5 grid grid-cols-2 gap-3">{spaces.map((item, index) => <button type="button" key={item.id} onClick={() => setSelected(index)} className="rounded-2xl p-4 text-left" style={{ background: index === selected ? "var(--primary-alpha-10)" : "var(--card)", border: "1px solid var(--border)" }}><MapPin size={18} style={{ color: "var(--primary)" }} /><span className="mt-2 block text-sm font-bold">{item.name}</span></button>)}</div>{space && <section className="mt-5 rounded-2xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><h2 className="font-black">{space.name}</h2><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{space.mapReference ?? "Espaço do DNJ 2K26."}</p></section>}</main>;
}
