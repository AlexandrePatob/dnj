import { Camera } from "lucide-react";
import type { MomentChallenge } from "@/lib/api/moment-challenges";

export function MomentChallengeCard({ challenge, onOpen }: { challenge: MomentChallenge; onOpen: () => void }) {
  return <section className="relative overflow-hidden rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #c61f3b, #ef6c20)", boxShadow: "var(--shadow-card)" }}>
    <span className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[16px] border-white/15" />
    <div className="relative flex items-center gap-2"><Camera size={16} /><span className="text-[.65rem] font-black uppercase tracking-[.14em]">Desafio Momento DNJ</span></div>
    <h2 className="relative mt-2 text-lg font-black">{challenge.title}</h2>
    {challenge.description ? <p className="relative mt-1 text-sm text-white/90">{challenge.description}</p> : null}
    <div className="relative mt-2 flex items-center justify-between gap-3"><span className="text-xs font-bold">+{challenge.points} pontos</span><button type="button" onClick={onOpen} className="rounded-xl bg-white px-3 py-2 text-xs font-black" style={{ color: "#c61f3b" }}>Abrir câmera</button></div>
  </section>;
}
