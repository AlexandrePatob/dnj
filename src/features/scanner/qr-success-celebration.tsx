"use client";

import { useEffect } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const particles = Array.from({ length: 14 }, (_, index) => ({ index, x: ((index * 47) % 180) - 90, y: -42 - ((index * 29) % 96), color: ["#E87425", "#B2D64D", "#DB3A2E", "#34D1D1"][index % 4] }));

export function QrSuccessCelebration({ points, label, onDone }: { points: number; label: string; onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  useEffect(() => { const timer = window.setTimeout(onDone, reducedMotion ? 160 : 900); return () => window.clearTimeout(timer); }, [onDone, reducedMotion]);
  return <motion.section className="absolute inset-0 z-[70] grid place-items-center overflow-hidden bg-[#0d1a1a]/95 p-6 text-center text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="assertive" aria-label="Participação confirmada">
    {!reducedMotion && particles.map((particle) => <motion.i key={particle.index} aria-hidden="true" className="absolute h-2.5 w-2.5 rounded-full" style={{ background: particle.color, left: "50%", top: "50%" }} initial={{ opacity: 1, x: 0, y: 0, scale: .2 }} animate={{ opacity: 0, x: particle.x, y: particle.y, scale: [0.6, 1.25, .25], rotate: 180 }} transition={{ duration: .74, ease: "easeOut", delay: particle.index * .012 }} />)}
    <motion.div initial={reducedMotion ? false : { scale: .66, y: 14 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 19 }}><span className="mx-auto grid h-20 w-20 place-items-center rounded-[28px]" style={{ background: "var(--game)", color: "#0d1a1a" }}><CheckCircle2 size={42} strokeWidth={2.8} /></span><p className="mt-7 text-sm font-bold uppercase tracking-[.18em] text-white/70">Participação confirmada</p><h2 className="mt-2 text-2xl font-black">+{points} pontos</h2><p className="mt-2 text-sm text-white/75">{label}</p><Sparkles className="mx-auto mt-4" size={19} style={{ color: "var(--game)" }} /></motion.div>
  </motion.section>;
}
