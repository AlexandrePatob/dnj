"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Trophy } from "lucide-react";
import { BrandSticker } from "@/components/brand/brand-sticker";
import type { UserData } from "@/features/app/types";
import styles from "./participant.module.css";

export function ParticipantHeader({ user, home = false, showAvatar = true, onHome, onAccount, onGame }: { user: UserData; home?: boolean; showAvatar?: boolean; onHome?: () => void; onAccount: () => void; onGame: () => void }) {
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("") || "DNJ";
  return <header className={`${styles.top} ${home ? styles.homeTop : ""}`}>
    {showAvatar ? <button type="button" className={styles.avatar} onClick={onAccount} aria-label="Abrir minha conta">
      {user.avatarUrl && failedAvatar !== user.avatarUrl ? <img src={user.avatarUrl} alt="" onError={() => setFailedAvatar(user.avatarUrl)} referrerPolicy="no-referrer" /> : <span>{initials}</span>}
    </button> : null}
    {home && <button type="button" className={`${styles.logo} border-0 bg-transparent p-0`} onClick={onHome} aria-label="Ir para Home"><BrandSticker className="h-full w-full" /></button>}
    <button type="button" className={`${styles.points} ${!showAvatar ? "ml-auto" : ""}`} onClick={onGame} aria-label={`${user.points.toLocaleString("pt-BR")} pontos. Abrir DNJ Game`}><Trophy size={22} aria-hidden="true" /><span>{user.points.toLocaleString("pt-BR")} <small>pts</small></span></button>
  </header>;
}
