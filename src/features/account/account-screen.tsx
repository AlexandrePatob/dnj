"use client";

import { useEffect, useId, useState } from "react";
import {
  BookOpen,
  Camera,
  Church,
  Footprints,
  Hammer,
  Images,
  LockKeyhole,
  LogOut,
  Moon,
  Send,
  Shield,
  Sprout,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { GameIcon } from "@/components/ui/dnj-controls";
import type { AnimDir, UserData } from "@/features/app/types";
import { DNJ_LEVELS, getDnjLevel } from "@/lib/levels";
import { gameApi } from "@/lib/api/game";
import { momentsApi } from "@/lib/api/moments";
import { PushNotificationSettings } from "@/components/pwa/push-notification-settings";
import journeyStyles from "@/components/layout/participant.module.css";

const journeyIcons = [Sprout, Footprints, BookOpen, Send, Hammer, Church];

function animStyle(dir: AnimDir): React.CSSProperties {
  const map: Record<AnimDir, string> = {
    right: "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",
    left: "slideInLeft 280ms cubic-bezier(0.22,1,0.36,1) both",
    up: "fadeUp 220ms cubic-bezier(0.22,1,0.36,1) both",
  };
  return { animation: map[dir] };
}

export function AccountScreen({
  user,
  onAvatarChange,
  onLogout,
  theme,
  onToggleTheme,
  animDir,
}: {
  user: UserData;
  onAvatarChange: (avatarUrl: string) => void;
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  animDir: AnimDir;
}) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [rankPosition, setRankPosition] = useState(user.rankPosition);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const avatarInputId = useId();
  useEffect(() => {
    void momentsApi
      .list("mine")
      .then((value) => setRecordCount(value.items.length))
      .catch(() => setRecordCount(null));
  }, []);
  useEffect(() => {
    void gameApi
      .overview()
      .then((overview) => {
        const current = overview as unknown as {
          current?: { rankPosition?: number };
        };
        const position = current.current?.rankPosition ?? overview.rankPosition;
        if (typeof position === "number" && position >= 0)
          setRankPosition(position);
      })
      .catch(() => undefined);
  }, []);
  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (
      !/^image\/(jpeg|png|webp)$/.test(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setAvatarError("Escolha uma imagem JPEG, PNG ou WebP de até 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAvatarError(null);
      onAvatarChange(reader.result);
    };
    reader.onerror = () =>
      setAvatarError("Não foi possível ler essa imagem. Tente outra foto.");
    reader.readAsDataURL(file);
  }
  const level = getDnjLevel(user.points);
  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "DNJ";
  return (
    <div
      key="account"
      className="absolute inset-0 overflow-y-auto"
      style={{
        background: "var(--background)",
        paddingBottom: "var(--main-content-bottom-padding)",
        ...animStyle(animDir),
      }}
    >
      <header
        className="px-5 pb-2"
        style={{
          background: "var(--background)",
          paddingTop:
            "calc(var(--participant-header-height) + 16px + var(--safe-area-top))",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <label
              htmlFor={avatarInputId}
              className="block h-full w-full cursor-pointer overflow-hidden rounded-full border-[3px] focus-within:outline-2 focus-within:outline-offset-2"
              style={{
                background: "#fff4e8",
                borderColor: "white",
                color: "#813900",
                boxShadow: "0 3px 8px #10290040",
                outlineColor: "var(--primary)",
              }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-base font-bold">
                  {initials}
                </span>
              )}
              <input
                id={avatarInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Alterar foto de perfil"
                onChange={(event) =>
                  selectAvatar(event.currentTarget.files?.[0])
                }
              />
            </label>
            <span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2"
              style={{
                background: "var(--card)",
                borderColor: "var(--card)",
                color: "var(--primary)",
              }}
              aria-hidden="true"
            >
              <Camera size={11} />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black">{user.name}</h1>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {user.group || "Grupo ainda não escolhido"}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              confirmingLogout ? onLogout() : setConfirmingLogout(true)
            }
            aria-label={
              confirmingLogout ? "Confirmar saída da conta" : "Sair da conta"
            }
            title={confirmingLogout ? "Confirmar saída" : "Sair da conta"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{
              background: confirmingLogout
                ? "var(--destructive)"
                : "var(--primary-alpha-10)",
              color: confirmingLogout ? "white" : "var(--primary)",
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
        {avatarError ? (
          <p
            role="alert"
            className="mt-3 text-xs"
            style={{ color: "var(--destructive)" }}
          >
            {avatarError}
          </p>
        ) : null}
      </header>
      <main className="flex flex-col gap-5 px-5 py-5">
        <section
          className="flex overflow-hidden rounded-2xl"
          aria-label="Resumo do jogo"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            {
              label: "Posição Geral",
              value: rankPosition > 0 ? `#${rankPosition}` : "—",
              icon: <Trophy size={16} />,
            },
            {
              label: "Momentos",
              value: recordCount ?? "—",
              icon: <Images size={16} />,
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`flex flex-1 items-center gap-3 px-4 py-3 ${index ? "border-l" : ""}`}
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                style={{
                  background: "var(--primary-alpha-10)",
                  color: "var(--primary)",
                }}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <strong className="block text-base font-black">
                  {item.value}
                </strong>
                <span
                  className="block truncate text-[0.65rem] font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.label}
                </span>
              </span>
            </div>
          ))}
        </section>
        <section
          className={journeyStyles.journey}
          aria-label="Minha jornada"
          style={{
            marginTop: 0,
            marginLeft: 0,
            marginRight: 0,
            boxShadow: "none",
            border: "1px solid var(--border)",
          }}
        >
          <ol className={journeyStyles.trail} aria-label="Etapas da jornada">
            {DNJ_LEVELS.map((stage, index) => {
              const reached = user.points >= stage.minPoints;
              const current = stage.name === level.name;
              const Icon = reached ? journeyIcons[index] : LockKeyhole;
              return (
                <li
                  key={stage.name}
                  className={`${journeyStyles.step} ${reached ? journeyStyles.done : ""} ${current ? journeyStyles.current : ""}`}
                  aria-current={current ? "step" : undefined}
                  aria-label={`${stage.name}: ${current ? "nível atual" : reached ? "alcançado" : `bloqueado, ${stage.minPoints} pontos`}`}
                >
                  <span className={journeyStyles.node}>
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <strong>{stage.name}</strong>
                </li>
              );
            })}
          </ol>
          <div className={journeyStyles.progressRow}>
            <progress
              aria-label="Progresso da jornada"
              max={100}
              value={level.progress}
            />
            <span>
              {level.nextPoints
                ? `${user.points} / ${level.nextPoints} pts`
                : `${user.points} pts`}
            </span>
          </div>
          <p className={journeyStyles.progressCaption}>
            Nível {level.name} ·{" "}
            {level.nextPoints
              ? `faltam ${level.pointsToNext} pontos para a próxima etapa`
              : "Você completou todas as etapas!"}
          </p>
        </section>
        <section
          className="overflow-hidden rounded-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="px-4 py-3">
            <p
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--muted-foreground)" }}
            >
              Preferências
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="flex w-full gap-3 border-t px-4 py-4 text-left"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "var(--accent-alpha-15)",
                color: "var(--accent)",
              }}
            >
              <Shield size={18} />
            </span>
            <span className="text-sm">
              <strong className="block">Privacidade protegida</strong>
              <span
                className="mt-1 block text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                CPF e dados pessoais não aparecem no perfil público.
              </span>
            </span>
          </button>
          <PushNotificationSettings />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={theme === "dark"}
            aria-label={`Tema atual: modo ${theme === "dark" ? "escuro" : "claro"}. ${theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}.`}
            className="flex w-full items-center gap-3 border-t px-4 py-4 text-left"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "var(--primary-alpha-10)",
                color: "var(--primary)",
              }}
            >
              <GameIcon active>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </GameIcon>
            </span>
            <span className="flex-1 text-sm">
              <strong className="block">
                {theme === "dark" ? "Usar modo claro" : "Usar modo escuro"}
              </strong>
              <span
                className="mt-1 block text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Tema atual: modo {theme === "dark" ? "escuro" : "claro"}
              </span>
            </span>
            <span
              className="h-6 w-11 rounded-full p-0.5"
              aria-hidden="true"
              style={{
                background:
                  theme === "dark"
                    ? "var(--primary)"
                    : "var(--switch-background)",
              }}
            >
              <span
                className="block h-5 w-5 rounded-full bg-white transition-transform"
                style={{
                  transform:
                    theme === "dark" ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </span>
          </button>
        </section>
      </main>
      {privacyOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Privacidade e dados cadastrais"
          className="fixed inset-0 z-[70] flex items-end bg-black/45"
          onClick={() => setPrivacyOpen(false)}
        >
          <section
            className="w-full rounded-t-3xl p-5"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "0 -12px 30px #0003",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="mx-auto mb-4 h-1.5 w-12 rounded-full"
              style={{ background: "var(--border)" }}
            />
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                  style={{
                    background: "var(--accent-alpha-15)",
                    color: "var(--accent)",
                  }}
                >
                  <Shield size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black">Privacidade protegida</h2>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Seus dados ficam protegidos e só são usados para identificar
                    sua participação no DNJ.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{
                  background: "var(--muted)",
                  color: "var(--foreground)",
                }}
                aria-label="Fechar privacidade"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["Nome", user.name],
                ["E-mail", user.email || "Não informado"],
                ["Telefone", user.mobilePhone || "Não informado"],
                ["Grupo", user.group || "Não escolhido"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl p-3"
                  style={{ background: "var(--muted)" }}
                >
                  <p
                    className="text-[0.65rem] font-bold uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-bold">{value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
