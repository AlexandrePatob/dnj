"use client";
/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Home, Trophy, User, Users } from "lucide-react";
import heroLogo from "@/assets/brand/DNJ_geral.png";
import type { Screen, Theme } from "@/features/app/types";
export function TopBar() {
  return (
    <motion.div
      style={{
        position:     "absolute",
        top:          0,
        left:         0,
        right:        0,
        height:       "48px",
        zIndex:       50,
        background:   "var(--primary)",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        paddingLeft:  "16px",
        paddingRight: "16px",
        gap:          "12px",
      }}
      initial={{ y: -48 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
    >
      <img
        src={heroLogo.src}
        alt="DNJ 2026"
        style={{ height: "28px", width: "auto", objectFit: "contain", flexShrink: 0 }}
      />
      <p
        style={{
          fontSize:   "0.7rem",
          fontWeight: "var(--font-weight-bold)" as React.CSSProperties["fontWeight"],
          fontStyle:  "italic",
          color:      "rgba(255,255,255,0.85)",
          textAlign:  "center",
          lineHeight: 1.3,
          flex:       1,
          minWidth:   0,
        }}
      >
        Vai, jovem, e reconstrói a minha igreja!
      </p>
    </motion.div>
  );
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

export function BottomNav({
  active, onNavigate,
}: {
  active: Screen; onNavigate: (s: Screen) => void;
}) {
  const items: { screen: Screen; icon: React.ReactNode; label: string }[] = [
    { screen: "home",    icon: <Home    size={22} />, label: "Home"    },
    { screen: "game",    icon: <Trophy  size={22} />, label: "DNJ Game" },
    { screen: "queue",   icon: <Users   size={22} />, label: "Fila"    },
    { screen: "account", icon: <User    size={22} />, label: "Conta"   },
  ];

  return (
    <motion.nav
      className="absolute bottom-0 left-0 right-0 flex items-stretch z-40"
      style={{
        background: "var(--card)",
        borderTop:  "1px solid var(--border)",
        height:     "68px",
      }}
      initial={{ y: 68 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {items.map(({ screen, icon, label }) => {
        const isActive = active === screen;
        return (
          <motion.button
            key={screen}
            onClick={() => onNavigate(screen)}
            className="relative z-0 flex-1 flex flex-col items-center justify-center gap-1 overflow-hidden"
            style={{ color: isActive ? "white" : "var(--muted-foreground)", position: "relative" }}
            whileTap={{ scale: 0.9 }}
          >
            {isActive && (
              <motion.span
                layoutId="active-nav"
                className="absolute inset-1 z-0 rounded-2xl"
                style={{ background: "var(--primary)", boxShadow: "0 6px 20px var(--primary-alpha-40)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <motion.span className="relative z-10" animate={isActive ? { y: -2, scale: 1.06 } : { y: 0, scale: 1 }}>{icon}</motion.span>
            <span className="relative z-10 text-xs font-semibold leading-none">{label}</span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
export function AppShell({ children, theme }: { children: ReactNode; theme: Theme }) {
  return <div className={theme === "dark" ? "dark" : ""} style={{ minHeight: "100dvh", background: theme === "dark" ? "#050e0e" : "#e8e8e8", display: "flex", justifyContent: "center", alignItems: "flex-start" }}><div className="game-shell relative w-full max-w-md overflow-hidden" style={{ minHeight: "100dvh", background: "var(--background)" }}><div className="game-atmosphere" aria-hidden="true"><span /><span /><span /></div>{children}</div></div>;
}