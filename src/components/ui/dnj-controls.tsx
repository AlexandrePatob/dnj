"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";
import { ArrowLeft, Camera, Gamepad2, Heart, Medal, QrCode, ShieldCheck, Star, Trophy, Users, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { TOP3_MEDAL } from "@/features/app/constants";

export function GameIcon({ children, active = false }: { children: ReactNode; active?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className="inline-flex items-center justify-center"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.55, rotate: -14 }}
      animate={reduceMotion ? undefined : active ? { opacity: 1, scale: [1, 1.14, 1], rotate: 0 } : { opacity: 1, scale: 1, rotate: 0 }}
      whileHover={reduceMotion ? undefined : { scale: 1.16, rotate: -7 }}
      whileTap={reduceMotion ? undefined : { scale: 0.84, rotate: 7 }}
      transition={active
        ? { duration: 0.38, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }
        : { type: "spring", stiffness: 430, damping: 20 }}
    >
      {children}
    </motion.span>
  );
}

export function PointIcon({ type }: { type: string }) {
  const map: Record<string, ReactNode> = {
    qr: <QrCode size={16} />,
    star: <Star size={16} />,
    heart: <Heart size={16} />,
    zap: <Zap size={16} />,
    users: <Users size={16} />,
    trophy: <Trophy size={16} />,
    medal: <Medal size={16} />,
    game: <Gamepad2 size={16} />,
    camera: <Camera size={16} />,
    shield: <ShieldCheck size={16} />,
    points: <Star size={16} />,
  };
  return <GameIcon>{map[type] ?? <Star size={16} />}</GameIcon>;
}

export function MedalBadge({ position }: { position: number }) {
  if (TOP3_MEDAL[position]) {
    return <span className="text-2xl leading-none flex-shrink-0">{TOP3_MEDAL[position]}</span>;
  }
  return (
    <span
      className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
      style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
    >
      {position}
    </span>
  );
}

export function PrimaryButton({
  onClick, disabled, children, className = "",
}: {
  onClick?: () => void; disabled?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 disabled:opacity-40 ${className}`}
      style={{ background: "var(--primary)", color: "white" }}
      whileHover={disabled ? undefined : { y: -2, boxShadow: "0 12px 28px var(--primary-alpha-40)" }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
    >
      {children}
    </motion.button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 w-fit transition-opacity hover:opacity-70 active:opacity-50"
      style={{ color: "var(--muted-foreground)" }}
    >
      <ArrowLeft size={18} />
      <span className="text-sm font-medium">Voltar</span>
    </button>
  );
}

export function FieldInput({
  label, error, description, id, ...props
}: { label: string; error?: string; description?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const ariaDescribedBy = [props["aria-describedby"], descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const filled = props.value !== undefined && String(props.value).length > 0;

  return (
    <motion.div
      className="flex flex-col gap-1.5"
      animate={focused ? { y: -2, scale: 1.01 } : { y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <motion.label
        htmlFor={inputId}
        className="text-xs font-semibold"
        animate={{ color: focused ? "var(--primary)" : "var(--muted-foreground)", x: focused ? 3 : 0 }}
        transition={{ duration: 0.18 }}
      >
        {label}
      </motion.label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error ? true : props["aria-invalid"]}
          className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--input-background)",
            color: "var(--foreground)",
            border: `1.5px solid ${focused ? "var(--primary)" : filled ? "var(--accent-alpha-30)" : "var(--border)"}`,
            boxShadow: focused ? "0 8px 24px var(--primary-alpha-15)" : "none",
          }}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        />
        <motion.span
          className="pointer-events-none absolute bottom-0 left-4 right-4 h-0.5 origin-left rounded-full"
          style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
          initial={false}
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {description ? <p id={descriptionId} className="text-xs" style={{ color: "var(--muted-foreground)" }}>{description}</p> : null}
      {error ? <p id={errorId} role="alert" className="text-xs font-medium" style={{ color: "var(--destructive)" }}>{error}</p> : null}
    </motion.div>
  );
}
