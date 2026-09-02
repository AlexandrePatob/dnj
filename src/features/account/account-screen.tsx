"use client";

import { useEffect, useId, useState } from "react";
import { Award, Camera, Moon, Shield, Star, Sun, Trophy } from "lucide-react";
import { GameIcon } from "@/components/ui/dnj-controls";
import type { AnimDir, UserData } from "@/features/app/types";
import { getDnjLevel } from "@/lib/levels";
import { gameApi } from "@/lib/api/game";
import { momentsApi } from "@/lib/api/moments";
import { PushNotificationSettings } from "@/components/pwa/push-notification-settings";

function animStyle(dir: AnimDir): React.CSSProperties {
  const map: Record<AnimDir, string> = { right: "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both", left: "slideInLeft 280ms cubic-bezier(0.22,1,0.36,1) both", up: "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both" };
  return { animation: map[dir] };
}

export function AccountScreen({ user, onAvatarChange, onLogout, theme, onToggleTheme, animDir }: { user: UserData; onAvatarChange: (avatarUrl: string) => void; onLogout: () => void; theme: "light" | "dark"; onToggleTheme: () => void; animDir: AnimDir }) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [rankPosition, setRankPosition] = useState(user.rankPosition);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputId = useId();
  useEffect(() => {
    void momentsApi.list("mine")
      .then((value) => setRecordCount(value.items.length))
      .catch(() => setRecordCount(null));
  }, []);
  useEffect(() => {
    void gameApi.overview()
      .then((overview) => {
        const current = overview as unknown as { current?: { rankPosition?: number } };
        const position = current.current?.rankPosition ?? overview.rankPosition;
        if (typeof position === "number" && position >= 0) setRankPosition(position);
      })
      .catch(() => undefined);
  }, []);
  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 3 * 1024 * 1024) {
      setAvatarError("Escolha uma imagem JPEG, PNG ou WebP de até 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAvatarError(null);
      onAvatarChange(reader.result);
    };
    reader.onerror = () => setAvatarError("Não foi possível ler essa imagem. Tente outra foto.");
    reader.readAsDataURL(file);
  }
  const level = getDnjLevel(user.points);
  return <div key="account" className="absolute inset-0 overflow-y-auto" style={{ background: "var(--background)", paddingBottom: "var(--main-content-bottom-padding)", ...animStyle(animDir) }}>
    <header className="px-5 pb-5" style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", paddingTop: "calc(64px + var(--safe-area-top))" }}>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <label htmlFor={avatarInputId} className="block h-full w-full cursor-pointer overflow-hidden rounded-xl focus-within:outline-2 focus-within:outline-offset-2" style={{ background: "var(--primary)", color: "white", boxShadow: "0 10px 22px var(--primary-alpha-40)", outlineColor: "var(--primary)" }}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-2xl font-black">{user.name[0]?.toUpperCase()}</span>}
            <input id={avatarInputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Alterar foto de perfil" onChange={(event) => selectAvatar(event.currentTarget.files?.[0])} />
          </label>
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2" style={{ background: "var(--card)", borderColor: "var(--card)", color: "var(--primary)" }} aria-hidden="true"><Camera size={13} /></span>
        </div>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-black">{user.name}</h1><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{user.group || "Grupo ainda não escolhido"}</p></div>
      </div>
      {avatarError ? <p role="alert" className="mt-3 text-xs" style={{ color: "var(--destructive)" }}>{avatarError}</p> : null}
      <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--primary-alpha-10)" }}>
        <div className="flex items-center justify-between gap-4"><span className="flex items-center gap-2 text-sm font-black" style={{ color: "var(--primary)" }}><Trophy size={18} /> Nível {level.name}</span><strong className="text-xs" style={{ color: "var(--muted-foreground)" }}>{level.nextPoints ? `${level.pointsToNext} pts para próximo` : "Nível máximo"}</strong></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--card)" }}><span className="block h-full rounded-full" style={{ width: `${level.progress}%`, background: "var(--primary)" }} /></div>
        <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{level.nextPoints ? `${user.points}/${level.nextPoints} pontos` : `${user.points} pontos`}</p>
      </div>
    </header>
    <main className="flex flex-col gap-5 px-5 py-5">
      <section className="grid grid-cols-3 gap-2" aria-label="Progresso no jogo">
        {[{ label: "Pontos", value: user.points, icon: <Star size={15} /> }, { label: "Ranking", value: rankPosition > 0 ? `#${rankPosition}` : "—", icon: <Trophy size={15} /> }, { label: "Momentos", value: recordCount ?? "—", icon: <Award size={15} /> }].map((item) => <div key={item.label} className="rounded-2xl px-2 py-3 text-center" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><span className="mx-auto mb-1 flex w-fit" style={{ color: "var(--primary)" }}>{item.icon}</span><strong className="block text-lg font-black" style={{ color: "var(--foreground)" }}>{item.value}</strong><span className="text-[0.65rem] font-semibold" style={{ color: "var(--muted-foreground)" }}>{item.label}</span></div>)}
      </section>
      <section className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><div className="px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Seu perfil</p></div><div className="px-4 pb-4"><p className="text-sm font-bold">{user.email || "E-mail não informado"}</p><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Sua identificação e CPF ficam protegidos na privacidade.</p></div></section>
      <section className="overflow-hidden rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}><div className="px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted-foreground)" }}>Preferências</p></div><div className="flex gap-3 border-t px-4 py-4" style={{ borderColor: "var(--border)" }}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--accent-alpha-15)", color: "var(--accent)" }}><Shield size={18} /></span><p className="text-sm"><strong className="block">Privacidade protegida</strong><span className="mt-1 block text-xs" style={{ color: "var(--muted-foreground)" }}>CPF e dados pessoais não aparecem no perfil público.</span></p></div><PushNotificationSettings /><button type="button" onClick={onToggleTheme} aria-pressed={theme === "dark"} aria-label={`Tema atual: modo ${theme === "dark" ? "escuro" : "claro"}. ${theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}.`} className="flex w-full items-center gap-3 border-t px-4 py-4 text-left" style={{ borderColor: "var(--border)" }}><span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}><GameIcon active>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</GameIcon></span><span className="flex-1 text-sm"><strong className="block">{theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}</strong><span className="mt-1 block text-xs" style={{ color: "var(--muted-foreground)" }}>Tema atual: modo {theme === "dark" ? "escuro" : "claro"}</span></span><span className="h-6 w-11 rounded-full p-0.5" aria-hidden="true" style={{ background: theme === "dark" ? "var(--primary)" : "var(--switch-background)" }}><span className="block h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: theme === "dark" ? "translateX(20px)" : "translateX(0)" }} /></span></button></section>
      <button type="button" onClick={() => confirmingLogout ? onLogout() : setConfirmingLogout(true)} className="py-3 text-sm font-bold" style={{ color: "var(--secondary)" }}>{confirmingLogout ? "Confirmar saída" : "Sair da conta"}</button>{confirmingLogout && <button type="button" onClick={() => setConfirmingLogout(false)} className="-mt-4 pb-2 text-sm" style={{ color: "var(--muted-foreground)" }}>Cancelar</button>}
    </main>
  </div>;
}

