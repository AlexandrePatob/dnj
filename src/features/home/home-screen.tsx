"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Calendar, ChevronDown, MapPin, Zap } from "lucide-react";
import { GameIcon } from "@/components/ui/dnj-controls";
import { MAP_PINS, SPACES } from "@/features/app/fixtures";
import type { AnimDir, UserData } from "@/features/app/types";
function animStyle(dir: AnimDir): React.CSSProperties { const map: Record<AnimDir,string>={right:"slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",left:"slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",up:"fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both"}; return { animation: map[dir] }; }
function SpaceItem({ name, desc }: { name: string; desc: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            style={{
              width: "8px", height: "8px", borderRadius: "2px",
              background: "var(--primary)", flexShrink: 0,
            }}
          />
          <span className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
            {name}
          </span>
        </div>
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
          {desc}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function MissionPulse({ points }: { points: number }) {
  const reduceMotion = useReducedMotion();
  const progress = Math.min((points / 200) * 100, 100);

  return (
    <motion.section
      className="mission-pulse"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      <div className="mission-copy">
        <div className="mission-live"><span /> MISSÃO ATIVA</div>
        <h2>Reconstrua.<br /><em>Um passo por vez.</em></h2>
        <p>Explore os espaços, escaneie desafios e fortaleça seu grupo.</p>
        <div className="mission-progress-label">
          <span>Nível Peregrino</span><strong>{points}/200 XP</strong>
        </div>
        <div className="mission-progress"><motion.span initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div>
      </div>

      <div className="mission-orbit" aria-hidden="true">
        <motion.div className="orbit orbit-one" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }}>
          <span className="orbit-node node-orange" />
        </motion.div>
        <motion.div className="orbit orbit-two" animate={reduceMotion ? undefined : { rotate: -360 }} transition={{ duration: 11, repeat: Infinity, ease: "linear" }}>
          <span className="orbit-node node-teal" />
        </motion.div>
        <motion.div className="mission-core" animate={reduceMotion ? undefined : { scale: [1, 1.06, 1], rotate: [0, 2, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <Zap size={26} fill="currentColor" />
          <small>ENERGIA</small>
          <strong>{points}</strong>
        </motion.div>
      </div>
    </motion.section>
  );
}

export function HomeScreen({ user, animDir }: { user: UserData; animDir: AnimDir }) {
  return (
    <div
      key="home"
      className="absolute inset-0 overflow-y-auto"
      style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", ...animStyle(animDir) }}
    >
      {/* Header */}
      <div
        className="px-6 pb-5"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(48px + var(--safe-area-top))" }}
      >
        <p className="font-medium mb-1" style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "15px" }}>
          Olá, {user.name.split(" ")[0]}! ✨
        </p>
        <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--foreground)" }}>
          Dia Nacional da Juventude
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--primary)" }}>
          Curitiba · 2026
        </p>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">

        <MissionPulse points={user.points} />

        {/* Cronograma */}
        <motion.div
          className="rounded-2xl flex items-center gap-4"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            padding: "16px 18px",
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.42 }}
          whileHover={{ y: -2, borderColor: "var(--accent)" }}
        >
          <div
            style={{
              width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
              background: "var(--accent-alpha-15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <GameIcon active><Calendar size={20} style={{ color: "var(--accent)" }} /></GameIcon>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--foreground)" }}>
              Cronograma do Evento
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              Programação completa em breve
            </p>
          </div>
          <button
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "var(--accent)", color: "#ffffff" }}
          >
            Acessar
          </button>
        </motion.div>

        {/* Espaços */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} style={{ color: "var(--primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Espaços do Evento
            </h3>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {SPACES.map((space) => (
              <SpaceItem key={space.id} name={space.name} desc={space.desc} />
            ))}
          </div>
        </div>

        {/* Mapa */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} style={{ color: "var(--primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Mapa do Local
            </h3>
          </div>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Map placeholder */}
            <div
              style={{
                position: "relative", height: "220px", overflow: "hidden",
                background: "linear-gradient(135deg, var(--muted) 0%, var(--card) 100%)",
              }}
            >
              {/* Grid lines */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.15 }}>
                {[20, 40, 60, 80].map((y) => (
                  <line key={`h${y}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="var(--foreground)" strokeWidth="1" />
                ))}
                {[20, 40, 60, 80].map((x) => (
                  <line key={`v${x}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="var(--foreground)" strokeWidth="1" />
                ))}
              </svg>

              {/* "Roads" */}
              <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.2 }}>
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--foreground)" strokeWidth="6" />
                <line x1="35%" y1="0" x2="35%" y2="100%" stroke="var(--foreground)" strokeWidth="4" />
                <line x1="65%" y1="0" x2="65%" y2="100%" stroke="var(--foreground)" strokeWidth="3" />
              </svg>

              {/* Pins */}
              {MAP_PINS.map((pin, index) => (
                <motion.div
                  key={pin.id}
                  style={{
                    position:  "absolute",
                    left:      `${pin.x}%`,
                    top:       `${pin.y}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                  initial={{ opacity: 0, y: -18, scale: 0.5 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 320, damping: 18 }}
                  whileHover={{ scale: 1.25, y: -4, zIndex: 3 }}
                >
                  <div
                    style={{
                      width: "28px", height: "28px", borderRadius: "50% 50% 50% 0",
                      background: pin.color, transform: "rotate(-45deg)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    <MapPin size={12} color="white" style={{ transform: "rotate(45deg)" }} />
                  </div>
                </motion.div>
              ))}

              {/* Legend */}
              <div
                style={{
                  position: "absolute", bottom: "10px", left: "10px", right: "10px",
                  background: "var(--card)", borderRadius: "10px",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {MAP_PINS.map((pin) => (
                    <div key={pin.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: pin.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.625rem", color: "var(--foreground)", whiteSpace: "nowrap" }}>
                        {pin.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── GAME SCREEN (DNJ GAME) ───────────────────────────────────────────────────
