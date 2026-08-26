"use client";

import { useState } from "react";
import { Camera, ChevronRight, Map, QrCode, Trophy, Users } from "lucide-react";
import { motion } from "motion/react";

const slides = [
  { icon: QrCode, title: "Escaneie e participe", body: "Use o QR Code do app para registrar sua presença nas experiências." },
  { icon: Camera, title: "Registre Momentos", body: "Em experiências elegíveis, compartilhe uma foto e ganhe pontos extras." },
  { icon: Trophy, title: "Acompanhe seus Pontos", body: "Veja seu progresso, ranking individual e ranking do seu grupo." },
  { icon: Users, title: "Filas e desafios", body: "Acompanhe sua posição e fique atento aos desafios especiais." },
  { icon: Map, title: "Explore o DNJ", body: "Use o mapa e o cronograma para encontrar o que acontece agora." },
];

export function DnjOnboarding({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0); const slide = slides[index]; const Icon = slide.icon;
  return <motion.section className="absolute inset-0 z-[65] flex items-end bg-[#0d1a1a]/75 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label="Conheça o DNJ Game"><motion.div className="w-full rounded-[28px] p-6" style={{ background: "var(--card)" }} initial={{ y: 45 }} animate={{ y: 0 }}><span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: "var(--primary-alpha-15)", color: "var(--primary)" }}><Icon size={27} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em]" style={{ color: "var(--muted-foreground)" }}>Como participar · {index + 1}/{slides.length}</p><h2 className="mt-2 text-2xl font-black">{slide.title}</h2><p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{slide.body}</p><div className="mt-6 flex gap-1.5">{slides.map((_, item) => <span key={item} className="h-1.5 flex-1 rounded-full" style={{ background: item <= index ? "var(--primary)" : "var(--muted)" }} />)}</div><button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white" style={{ background: "var(--primary)" }} onClick={() => index === slides.length - 1 ? onClose() : setIndex(index + 1)}>{index === slides.length - 1 ? "Começar a jornada" : "Próximo"}<ChevronRight size={18} /></button><button className="mt-3 w-full py-2 text-sm font-semibold" style={{ color: "var(--muted-foreground)" }} onClick={onClose}>Pular por agora</button></motion.div></motion.section>;
}
