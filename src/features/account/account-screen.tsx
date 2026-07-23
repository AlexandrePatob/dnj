"use client";
import { Bell, ChevronRight, LogOut, Moon, Shield, Sun } from "lucide-react";
import { GameIcon } from "@/components/ui/dnj-controls";
import type { AnimDir, UserData } from "@/features/app/types";
function animStyle(dir: AnimDir): React.CSSProperties { const map: Record<AnimDir,string>={right:"slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",left:"slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",up:"fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both"}; return { animation: map[dir] }; }
export function AccountScreen({
  user, onLogout, theme, onToggleTheme, animDir,
}: {
  user: UserData; onLogout: () => void; theme: "light" | "dark"; onToggleTheme: () => void; animDir: AnimDir;
}) {
  const maskedCPF = user.cpf
    ? user.cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, "***.$2.$3-**")
    : "***.***.***-**";

  return (
    <div
      key="account"
      className="absolute inset-0 overflow-y-auto pb-28"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      <div
        className="px-6 pt-12 pb-6 flex flex-col items-center"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black mb-3"
          style={{ background: "var(--primary)", color: "white" }}
        >
          {user.name[0]}
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          {user.name}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--accent-alpha-15)", color: "var(--accent)" }}>
            {user.points} pontos
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}>
            #{user.rankPosition} no ranking
          </span>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Perfil
            </p>
          </div>
          {[
            { label: "Nome",   value: user.name },
            { label: "CPF",    value: maskedCPF },
            { label: "E-mail", value: user.email || "—" },
            { label: "Grupo",  value: user.group || "—" },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center px-4 py-3.5"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted-foreground)" }}>{item.label}</p>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              Configurações
            </p>
          </div>
          {[
            { icon: <Bell size={18} />,   label: "Notificações", bg: "var(--teal-alpha-15)",   color: "var(--chart-2)" },
            { icon: <Shield size={18} />, label: "Privacidade",  bg: "var(--accent-alpha-15)", color: "var(--accent)"  },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: item.bg, color: item.color }}>
                <GameIcon>{item.icon}</GameIcon>
              </div>
              <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--foreground)" }}>{item.label}</span>
              <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
            </button>
          ))}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}>
              <GameIcon active>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</GameIcon>
            </div>
            <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--foreground)" }}>
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </span>
            {/* pill toggle */}
            <span
              className="relative flex-shrink-0 rounded-full transition-colors"
              style={{
                width: "44px", height: "24px",
                background: theme === "dark" ? "var(--primary)" : "var(--switch-background)",
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform"
                style={{
                  width: "20px", height: "20px",
                  background: "white",
                  left: "2px",
                  transform: theme === "dark" ? "translateX(20px)" : "translateX(0)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--red-alpha-12)", color: "var(--secondary)" }}>
              <GameIcon><LogOut size={18} /></GameIcon>
            </div>
            <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--secondary)" }}>Sair da conta</span>
          </button>
        </div>

        <p className="text-center text-xs pb-2" style={{ color: "var(--muted-foreground)" }}>
          DNJ · Curitiba 2026 · v1.0.0
        </p>
      </div>
    </div>
  );
}
