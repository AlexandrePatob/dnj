"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronDown, Heart } from "lucide-react";
import { GameIcon } from "@/components/ui/dnj-controls";
import { CONFESSION_FAQ, SPIRITUAL_FAQ } from "@/features/app/fixtures";
import type { AnimDir, QueueType } from "@/features/app/types";
function animStyle(dir: AnimDir): React.CSSProperties { const map: Record<AnimDir,string>={right:"slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",left:"slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",up:"fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both"}; return { animation: map[dir] }; }
function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)", flex: 1 }}>
          {question}
        </span>
        <ChevronDown
          size={16}
          style={{
            color:      "var(--muted-foreground)",
            flexShrink: 0,
            transform:  open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="px-4 pb-4 text-sm leading-relaxed"
          style={{ color: "var(--muted-foreground)", overflow: "hidden" }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {answer}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// Space accordion item
// ─── QR Modal ─────────────────────────────────────────────────────────────────
export function QueueScreen({ animDir }: { animDir: AnimDir }) {
  const [queueType, setQueueType] = useState<QueueType>(null);
  const [position, setPosition]   = useState(12);

  // Simulate queue advancing — decrements every 15 s while in queue, stops at 1
  useEffect(() => {
    if (!queueType) return;
    if (position <= 1) return;
    const id = setInterval(() => {
      setPosition((p) => Math.max(1, p - 1));
    }, 15000);
    return () => clearInterval(id);
  }, [queueType, position]);

  const isConfession = queueType === "confession";
  const faq = isConfession ? CONFESSION_FAQ : SPIRITUAL_FAQ;

  if (!queueType) {
    return (
      <div
        key="queue-select"
        className="absolute inset-0 overflow-y-auto pb-28"
        style={{ background: "var(--background)", ...animStyle(animDir) }}
      >
        <div
          className="px-6 pt-12 pb-5"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
        >
          <h1 className="font-bold mx-[0px] mt-[16px] mb-[0px] text-[24px]" style={{ color: "var(--foreground)" }}>
            Fila do Espaço Esperança
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Espaço Esperança · Confissão & Direção Espiritual
          </p>
        </div>

        <div className="px-5 pt-6 flex flex-col gap-4">
          <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
            Escolha o tipo de atendimento:
          </p>

          {/* Confissão */}
          <div
            className="rounded-2xl"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", overflow: "hidden" }}
          >
            <div className="flex items-center gap-4 p-5">
              <div
                style={{
                  width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
                  background: "var(--primary-alpha-15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <GameIcon><BookOpen size={22} style={{ color: "var(--primary)" }} /></GameIcon>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--foreground)" }}>
                  Confissão
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Sacramento da reconciliação com um sacerdote.
                </p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
              <button
                onClick={() => setQueueType("confession")}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "var(--primary)", color: "white" }}
              >
                Entrar na fila de Confissão
              </button>
            </div>
          </div>

          {/* Direção Espiritual */}
          <div
            className="rounded-2xl"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)", overflow: "hidden" }}
          >
            <div className="flex items-center gap-4 p-5">
              <div
                style={{
                  width: "48px", height: "48px", borderRadius: "12px", flexShrink: 0,
                  background: "var(--teal-alpha-15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <GameIcon><Heart size={22} style={{ color: "var(--chart-2)" }} /></GameIcon>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--foreground)" }}>
                  Direção Espiritual
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Diálogo sobre sua caminhada de fé e discernimento.
                </p>
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
              <button
                onClick={() => setQueueType("spiritual")}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "var(--chart-2)", color: "var(--background)" }}
              >
                Entrar na fila de Direção Espiritual
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      key={`queue-${queueType}`}
      className="absolute inset-0 overflow-y-auto pb-28"
      style={{ background: "var(--background)", animation: "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both" }}
    >
      {/* Header */}
      <div
        className="px-6 pt-12 pb-5 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <h1 className="tex mx-[0px] mt-[16px] mb-[0px]t-xl font-bold text-[24px]" style={{ color: "var(--foreground)" }}>
          {isConfession ? "Confissão" : "Direção Espiritual"}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Espaço Esperança
        </p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">

        {/* Position card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isConfession ? "var(--primary)" : "var(--chart-2)",
            padding: "28px 24px",
          }}
        >
          <p className="text-sm font-medium text-white/80 mb-1">Sua posição na fila</p>
          <div className="flex items-end gap-2">
            <span className="text-6xl font-black text-white leading-none">{position}°</span>
          </div>
        </div>

        {/* Sair da fila */}
        <button
          onClick={() => setQueueType(null)}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--red-alpha-12)", color: "var(--secondary)" }}
        >
          Sair da fila
        </button>

        {/* Instructions accordion */}
        <div>
          <p className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--foreground)" }}>
            {isConfession ? "Preparação para a Confissão" : "Preparação para a Direção Espiritual"}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {faq.map((item, i) => (
              <div key={i} style={{ borderBottom: i < faq.length - 1 ? undefined : "none" }}>
                <AccordionItem question={item.q} answer={item.a} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── ACCOUNT SCREEN ───────────────────────────────────────────────────────────
