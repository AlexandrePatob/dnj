"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { groupsApi } from "@/lib/api/groups";
import { mapApiUser } from "@/lib/api/mappers";
import type { ApiGroup } from "@/lib/api/contracts";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import { ConnectivityStatus } from "@/components/pwa/connectivity-status";
import { usePwa } from "@/components/pwa/pwa-registrar";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  clearOfflineSnapshot,
  migrateThemeStorage,
  readOfflineSnapshot,
  writeOfflineSnapshot,
} from "@/lib/pwa/offline-snapshot";
import heroLogo from "../assets/brand/DNJ_geral.png";
import internalLogoLight from "../assets/brand/DNJGAME_02.png";
import internalLogoDark from "../assets/brand/DNJGAME_DARK.png";
import {
  Home,
  QrCode,
  User,
  Trophy,
  Star,
  Search,
  X,
  ArrowLeft,
  Check,
  Zap,
  Heart,
  Users,
  Bell,
  Shield,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Camera,
  MapPin,
  Plus,
  Calendar,
  ChevronDown,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "login" | "verify" | "group" | "register" | "register-verify" | "home" | "game" | "queue" | "account";
type GameTab = "overview" | "ranking";
type RankingTab = "individual" | "grupos";
type QueueType = "confession" | "spiritual" | null;
type AnimDir = "right" | "left" | "up";

interface UserData {
  name: string;
  cpf: string;
  email: string;
  group: string;
  points: number;
  rankPosition: number;
}

function requestErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Não foi possível concluir a solicitação.";
}

// ─── Screen transition logic ──────────────────────────────────────────────────

const AUTH_ORDER: Screen[] = ["login", "register", "register-verify", "verify", "group"];

function getAnimDir(from: Screen, to: Screen): AnimDir {
  const fi = AUTH_ORDER.indexOf(from);
  const ti = AUTH_ORDER.indexOf(to);
  if (fi !== -1 && ti !== -1) return ti > fi ? "right" : "left";
  return "up";
}

function animStyle(dir: AnimDir): React.CSSProperties {
  const map: Record<AnimDir, string> = {
    right: "slideInRight 280ms cubic-bezier(0.22,1,0.36,1) both",
    left:  "slideInLeft  280ms cubic-bezier(0.22,1,0.36,1) both",
    up:    "fadeUp       220ms cubic-bezier(0.22,1,0.36,1) both",
  };
  return { animation: map[dir] };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const YOUTH_GROUPS = [
  "Jovens da Paróquia Nossa Senhora da Luz",
  "Grupo Chama Viva – Bairro Alto",
  "Comunidade Jovem São Francisco",
  "Jovens Esperança – Fazendinha",
  "GJC Santa Teresinha – Portão",
  "Grupo Viver Cristo – CIC",
  "Jovens da Sagrada Família – Bacacheri",
  "Movimento Jovem São José – Cajuru",
  "Jovens do Caminho – Água Verde",
  "GJC Ressurreição – Boa Vista",
];

const SPACES = [
  {
    id: 1,
    name: "Espaço Juventude",
    desc: "Local central de encontro e convivência dos jovens durante o evento. Programação cultural, música ao vivo e momentos de partilha.",
  },
  {
    id: 2,
    name: "Espaço Esperança",
    desc: "Dedicado à reconciliação e à escuta. Oferece confissões e direção espiritual com sacerdotes e orientadores.",
  },
  {
    id: 3,
    name: "Espaço Radicalidade",
    desc: "Dinâmicas e desafios para aprofundar a fé. Testemunhos, debates e atividades que provocam uma resposta radical ao Evangelho.",
  },
  {
    id: 4,
    name: "Espaço Santidade",
    desc: "Momentos de adoração, oração e contemplação. Ambiente preparado para o encontro pessoal com Deus.",
  },
  {
    id: 5,
    name: "Feira Vocacional",
    desc: "Conheça comunidades religiosas, congregações e movimentos. Uma oportunidade para descobrir o chamado de Deus na sua vida.",
  },
  {
    id: 6,
    name: "Espaço Missão",
    desc: "Informações sobre projetos missionários, voluntariado e ação social da Diocese de Curitiba.",
  },
];

const MAP_PINS = [
  { id: 1, label: "Espaço Juventude",    x: 48, y: 38, color: "var(--primary)"   },
  { id: 2, label: "Espaço Esperança",    x: 27, y: 55, color: "var(--chart-2)"   },
  { id: 3, label: "Espaço Radicalidade", x: 65, y: 58, color: "var(--accent)"    },
  { id: 4, label: "Espaço Santidade",    x: 42, y: 72, color: "var(--secondary)" },
  { id: 5, label: "Feira Vocacional",    x: 72, y: 30, color: "var(--chart-5)"   },
];

const POINTS_LOG = [
  { id: 1, icon: "qr",    label: "QR Code – Abertura do evento",  points: 50, time: "14:32" },
  { id: 2, icon: "star",  label: "Desafio bíblico completado",     points: 30, time: "15:10" },
  { id: 3, icon: "heart", label: "Ação solidária registrada",      points: 40, time: "15:55" },
  { id: 4, icon: "zap",   label: "Primeiro acesso ao app",         points: 10, time: "14:00" },
  { id: 5, icon: "users", label: "Participação em grupo",          points: 20, time: "16:20" },
];

const INDIVIDUAL_RANKING = [
  { id:  1, name: "Ana Carolina Silva",    group: "Chama Viva",               points: 380, isUser: false },
  { id:  2, name: "Lucas Fernandes",       group: "GJC Santa Teresinha",      points: 340, isUser: false },
  { id:  3, name: "Maria Eduarda Costa",   group: "Jovens da Luz",            points: 310, isUser: false },
  { id:  4, name: "João Pedro Alves",      group: "Grupo São Francisco",      points: 280, isUser: false },
  { id:  5, name: "Beatriz Oliveira",      group: "Jovens Esperança",         points: 260, isUser: false },
  { id:  6, name: "Rafael Santos",         group: "Jovens do Caminho",        points: 240, isUser: false },
  { id:  7, name: "Júlia Mendes",          group: "GJC Ressurreição",         points: 210, isUser: false },
  { id:  8, name: "Gabriel Lima",          group: "Mov. Jovem São José",      points: 190, isUser: false },
  { id:  9, name: "Você",                  group: "Chama Viva",               points: 150, isUser: true  },
  { id: 10, name: "Larissa Rocha",         group: "Jovens do Caminho",        points: 130, isUser: false },
  { id: 11, name: "Pedro Henrique",        group: "Comunidade São Francisco", points: 120, isUser: false },
  { id: 12, name: "Camila Souza",          group: "Grupo Viver Cristo",       points: 110, isUser: false },
  { id: 13, name: "Felipe Andrade",        group: "Jovens da Luz",            points: 105, isUser: false },
  { id: 14, name: "Isabela Martins",       group: "GJC Santa Teresinha",      points:  98, isUser: false },
  { id: 15, name: "Thiago Carvalho",       group: "Jovens Esperança",         points:  92, isUser: false },
  { id: 16, name: "Fernanda Lima",         group: "Chama Viva",               points:  87, isUser: false },
  { id: 17, name: "Mateus Oliveira",       group: "Grupo São Francisco",      points:  83, isUser: false },
  { id: 18, name: "Vitória Pereira",       group: "GJC Ressurreição",         points:  78, isUser: false },
  { id: 19, name: "Bruno Costa",           group: "Mov. Jovem São José",      points:  74, isUser: false },
  { id: 20, name: "Amanda Ferreira",       group: "Jovens do Caminho",        points:  70, isUser: false },
  { id: 21, name: "Rodrigo Almeida",       group: "Jovens da Luz",            points:  66, isUser: false },
  { id: 22, name: "Natália Souza",         group: "Grupo Viver Cristo",       points:  62, isUser: false },
  { id: 23, name: "Leonardo Gomes",        group: "GJC Santa Teresinha",      points:  58, isUser: false },
  { id: 24, name: "Priscila Nunes",        group: "Chama Viva",               points:  54, isUser: false },
  { id: 25, name: "Diego Ribeiro",         group: "Jovens Esperança",         points:  50, isUser: false },
  { id: 26, name: "Caroline Teixeira",     group: "Grupo São Francisco",      points:  46, isUser: false },
  { id: 27, name: "Samuel Borges",         group: "GJC Ressurreição",         points:  42, isUser: false },
  { id: 28, name: "Mariana Castro",        group: "Jovens do Caminho",        points:  38, isUser: false },
  { id: 29, name: "Henrique Dias",         group: "Mov. Jovem São José",      points:  34, isUser: false },
  { id: 30, name: "Júlia Ramos",           group: "Comunidade São Francisco", points:  30, isUser: false },
];

const GROUP_RANKING = [
  { id:  1, name: "Chama Viva – Bairro Alto",     members: 12, points: 1840 },
  { id:  2, name: "GJC Santa Teresinha",           members: 10, points: 1620 },
  { id:  3, name: "Jovens da Luz",                 members: 14, points: 1540 },
  { id:  4, name: "Jovens Esperança",              members:  9, points: 1320 },
  { id:  5, name: "Grupo São Francisco",           members: 11, points: 1180 },
  { id:  6, name: "Jovens do Caminho",             members:  8, points: 1040 },
  { id:  7, name: "GJC Ressurreição",              members: 13, points:  960 },
  { id:  8, name: "Movimento Jovem São José",      members:  7, points:  820 },
  { id:  9, name: "Comunidade São Francisco",      members:  9, points:  740 },
  { id: 10, name: "Grupo Viver Cristo – CIC",      members:  6, points:  650 },
];

const CONFESSION_FAQ = [
  {
    q: "Como me preparar para a confissão?",
    a: "Reserve um momento de silêncio e faça um exame de consciência, recordando seus atos, palavras e omissões desde a última confissão. Peça ao Espírito Santo que ilumine sua memória e seu coração.",
  },
  {
    q: "Como fazer um bom exame de consciência?",
    a: "Reflita sobre os 10 mandamentos e as virtudes cristãs. Pergunte-se: amei a Deus acima de tudo? Respeitei o próximo? Fui honesto? Pratiquei obras de misericórdia?",
  },
  {
    q: "O que digo ao padre na confissão?",
    a: "Diga o tempo da última confissão, seus pecados com sinceridade e peça a absolvição. Não precisa ser perfeito — Deus valoriza a honestidade e a contrição do coração.",
  },
  {
    q: "O que é a contrição?",
    a: "É o arrependimento sincero pelos pecados cometidos e o firme propósito de não pecar mais. É o elemento mais importante para uma boa confissão.",
  },
  {
    q: "O sigilo da confissão é garantido?",
    a: "Sim. O sigilo sacramental é absoluto. O padre nunca pode revelar o que ouviu em confissão, sob nenhuma circunstância.",
  },
];

const SPIRITUAL_FAQ = [
  {
    q: "O que é direção espiritual?",
    a: "É um acompanhamento pessoal feito por um padre ou orientador espiritual para ajudá-lo a discernir a vontade de Deus em sua vida, crescer na oração e tomar decisões à luz da fé.",
  },
  {
    q: "Qual a diferença entre confissão e direção espiritual?",
    a: "A confissão é um sacramento de perdão. A direção espiritual é um diálogo de discernimento — não precisa incluir absolvição, embora possa acontecer junto.",
  },
  {
    q: "Como aproveitar melhor esse momento?",
    a: "Venha com abertura e honestidade. Pense antes nas perguntas que carrega no coração — vocação, relacionamentos, oração, dificuldades na fé. O diretor espiritual é um companheiro de caminho, não um juiz.",
  },
  {
    q: "Preciso me preparar?",
    a: "Não é obrigatório, mas ajuda. Passe alguns minutos em oração antes, pedindo luz ao Espírito Santo. Trazer um tema ou questão específica torna o encontro mais frutífero.",
  },
];

const TOP3_BG: Record<number, string> = {
  1: "var(--primary-alpha-15)",
  2: "var(--teal-alpha-15)",
  3: "var(--accent-alpha-10)",
};

// ─── useCountUp ───────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const reduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      const reducedRaf = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(reducedRaf);
    }
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return value;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function GameIcon({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
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

function PointIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    qr:    <QrCode  size={16} />,
    star:  <Star    size={16} />,
    heart: <Heart   size={16} />,
    zap:   <Zap     size={16} />,
    users: <Users   size={16} />,
  };
  return <GameIcon>{map[type] ?? <Star size={16} />}</GameIcon>;
}

const TOP3_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function MedalBadge({ position }: { position: number }) {
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

function PrimaryButton({
  onClick, disabled, children, className = "",
}: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string;
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

function BackButton({ onClick }: { onClick: () => void }) {
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

function FieldInput({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const filled = props.value !== undefined && String(props.value).length > 0;

  return (
    <motion.div
      className="flex flex-col gap-1.5"
      animate={focused ? { y: -2, scale: 1.01 } : { y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <motion.label
        className="text-xs font-semibold"
        animate={{ color: focused ? "var(--primary)" : "var(--muted-foreground)", x: focused ? 3 : 0 }}
        transition={{ duration: 0.18 }}
      >
        {label}
      </motion.label>
      <div className="relative">
        <input
          {...props}
          className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: "var(--input-background)",
            color:      "var(--foreground)",
            border:     `1.5px solid ${focused ? "var(--primary)" : filled ? "var(--accent-alpha-30)" : "var(--border)"}`,
            boxShadow:  focused ? "0 8px 24px var(--primary-alpha-15)" : "none",
          }}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        />
        <motion.span
          className="pointer-events-none absolute bottom-0 left-4 right-4 h-0.5 origin-left rounded-full"
          style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
          initial={false}
          animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

// Simple accordion item
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

// ─── CrossLogo ────────────────────────────────────────────────────────────────

function CrossLogo({ large = false }: { large?: boolean }) {
  const sz = large
    ? { w: 36, h: 46, vw: 36, vh: 46, rx: 14, ry: 0, rw: 8, rh: 46, rx2: 0, ry2: 15, rw2: 36, rh2: 8 }
    : { w: 22, h: 28, vw: 22, vh: 28, rx: 8.5, ry: 0, rw: 5, rh: 28, rx2: 0, ry2: 9, rw2: 22, rh2: 5 };
  return (
    <div className="flex items-center gap-3">
      <svg width={sz.w} height={sz.h} viewBox={`0 0 ${sz.vw} ${sz.vh}`} fill="none">
        <rect x={sz.rx} y={sz.ry} width={sz.rw} height={sz.rh} rx="2.5" fill="var(--primary)" />
        <rect x={sz.rx2} y={sz.ry2} width={sz.rw2} height={sz.rh2} rx="2.5" fill="var(--primary)" />
      </svg>
      <div className="flex items-end gap-1">
        <span
          className="font-black leading-none"
          style={{ fontSize: large ? "2rem" : "1.1rem", letterSpacing: "-0.03em", color: "var(--foreground)" }}
        >
          DNJ
        </span>
        <span
          className="font-black leading-none"
          style={{ fontSize: large ? "2rem" : "1.1rem", letterSpacing: "-0.03em", color: "var(--primary)", paddingBottom: "0.06em" }}
        >
          GAME
        </span>
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QRModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "var(--background)" }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        onClick={onClose}
        className="absolute top-12 right-6 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "var(--muted)" }}
      >
        <X size={18} style={{ color: "var(--foreground)" }} />
      </button>

      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--primary-alpha-15)" }}
        >
          <Camera size={26} style={{ color: "var(--primary)" }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          Escanear QR Code
        </h3>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Aponte a câmera para um QR Code do evento
        </p>
      </div>

      <div style={{ position: "relative", width: "256px", height: "256px", marginBottom: "32px" }}>
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <div
            key={c}
            style={{
              position:     "absolute",
              width:        "32px",
              height:       "32px",
              top:          c.startsWith("t") ? 0 : undefined,
              bottom:       c.startsWith("b") ? 0 : undefined,
              left:         c.endsWith("l")   ? 0 : undefined,
              right:        c.endsWith("r")   ? 0 : undefined,
              borderTop:    c.startsWith("t") ? "3px solid var(--primary)" : undefined,
              borderBottom: c.startsWith("b") ? "3px solid var(--primary)" : undefined,
              borderLeft:   c.endsWith("l")   ? "3px solid var(--primary)" : undefined,
              borderRight:  c.endsWith("r")   ? "3px solid var(--primary)" : undefined,
              borderRadius: c === "tl" ? "8px 0 0 0" : c === "tr" ? "0 8px 0 0" : c === "bl" ? "0 0 0 8px" : "0 0 8px 0",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute", inset: "14px", borderRadius: "10px",
            background: "var(--muted)", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center", opacity: 0.3 }}>
            <QrCode size={44} style={{ color: "var(--muted-foreground)", display: "block", margin: "0 auto 8px" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Câmera</p>
          </div>
          <div
            style={{
              position: "absolute", left: 0, right: 0, height: "2px",
              background: "linear-gradient(90deg, transparent 0%, var(--primary) 30%, var(--primary) 70%, transparent 100%)",
              animation: "scanLine 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
            }}
          />
        </div>
      </div>

      <p className="text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
        Posicione o QR Code dentro da área demarcada
      </p>
    </motion.div>
  );
}

// ─── Top Bar ─────────────────────────────────────────────────────────────────

function TopBar({ theme }: { theme: "light" | "dark" }) {
  const isLight = theme === "light";
  const internalLogo = isLight ? internalLogoLight : internalLogoDark;
  return (
    <motion.div
      style={{
        position:     "absolute",
        top:          0,
        left:         0,
        right:        0,
        height:       "48px",
        zIndex:       50,
        background:   isLight ? "var(--primary)" : "var(--card)",
        borderBottom: isLight ? "none" : "1px solid var(--border)",
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
        src={internalLogo.src}
        alt="DNJ 2026"
        style={{ height: "28px", width: "auto", objectFit: "contain", flexShrink: 0 }}
      />
      <p
        style={{
          fontSize:   "0.7rem",
          fontWeight: "var(--font-weight-bold)" as React.CSSProperties["fontWeight"],
          fontStyle:  "italic",
          color:      isLight ? "rgba(255,255,255,0.85)" : "var(--muted-foreground)",
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

function BottomNav({
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

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({
  onNext, onRegister, animDir,
}: {
  onNext: (email: string, cpf: string) => Promise<void>; onRegister: () => void; animDir: AnimDir;
}) {
  const [cpf, setCpf]     = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const reduceMotion = useReducedMotion();

  function formatCPF(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/,                   "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/,           "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  const valid = cpf.replace(/\D/g, "").length === 11 && email.includes("@");

  async function submitLogin() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onNext(email, cpf);
    } catch (error) {
      setSubmitError(requestErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      key="login"
      className="flex flex-col min-h-dvh"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      {/* Orange hero with official logo */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "var(--primary)", paddingTop: "56px", paddingBottom: "32px" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <motion.div
          className="relative z-10"
          style={{ width: "72%", maxWidth: "280px" }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: -5, y: 18 }}
          animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
        >
          <motion.img
            src={heroLogo.src}
            alt="DNJ GAME 2026"
            style={{ width: "100%", height: "auto", transformOrigin: "50% 100%" }}
            animate={reduceMotion ? undefined : {
              y:      [0, -15, 0, -5, 0],
              scaleX: [1, 0.97, 1.04, 0.99, 1],
              scaleY: [1, 1.05, 0.96, 1.02, 1],
              rotate: [0, -1.2, 0, 0.7, 0],
            }}
            transition={{
              duration: 1.05,
              times: [0, 0.28, 0.55, 0.76, 1],
              ease: [0.22, 1, 0.36, 1],
              repeat: Infinity,
              repeatDelay: 2.1,
            }}
          />
        </motion.div>
        <p
          className="text-sm text-center relative z-10 mt-4 font-medium"
          style={{ color: "rgba(0,0,0,0.55)" }}
        >
          Curitiba · 2026
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col flex-1 px-6 pt-6 pb-10 gap-5">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
            Bem-vindo(a)! 👋
          </h2>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Entre com seus dados para participar
          </p>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <FieldInput
            label="CPF"
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
          />
          <FieldInput
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {submitError ? <p className="text-sm" style={{ color: "var(--secondary)" }}>{submitError}</p> : null}
          <PrimaryButton onClick={submitLogin} disabled={!valid || submitting} className="mt-1">
            {submitting ? "Enviando código..." : "Entrar"}
          </PrimaryButton>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          Ao entrar, você concorda com os{" "}
          <span className="underline" style={{ color: "var(--primary)" }}>termos de uso</span>{" "}
          do evento.
        </p>

        <p className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Não conseguiu acessar?{" "}
          <button
            onClick={onRegister}
            className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
            style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
          >
            Crie uma conta
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── REGISTER SCREEN ─────────────────────────────────────────────────────────

function RegisterScreen({
  onBack, onDone, animDir,
}: {
  onBack: () => void; onDone: (email: string) => void; animDir: AnimDir;
}) {
  const [nome, setNome]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [query, setQuery]     = useState("");
  const [group, setGroup]     = useState("");
  const [adding, setAdding]   = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const filtered = YOUTH_GROUPS.filter((g) =>
    g.toLowerCase().includes(query.toLowerCase())
  );

  function formatPhone(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2)  return d.replace(/(\d{0,2})/, "($1");
    if (d.length <= 7)  return d.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  }

  const valid = nome.trim().length >= 2 && email.includes("@") && phone.replace(/\D/g, "").length >= 10 && group !== "";

  return (
    <div
      key="register"
      className="flex flex-col min-h-dvh px-6 pt-12 pb-10 overflow-y-auto"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      <BackButton onClick={onBack} />

      <div className="mt-6 mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Criar conta
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Preencha seus dados para participar do DNJ Game
        </p>
      </div>

      {/* Personal fields */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4 mb-5"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <FieldInput
          label="Nome completo"
          type="text"
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <FieldInput
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FieldInput
          label="Telefone WhatsApp"
          type="tel"
          inputMode="numeric"
          placeholder="(41) 99999-0000"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
      </div>

      {/* Group selection */}
      <div className="mb-5">
        <p className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--foreground)" }}>
          Grupo de Jovens
        </p>

        <AnimatePresence>
        {group && !adding && (
          <motion.div
            className="rounded-xl p-3 mb-3 flex items-center gap-3"
            style={{ background: "var(--accent-alpha-10)", border: "1.5px solid var(--accent-alpha-30)" }}
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <GameIcon active><Check size={15} style={{ color: "var(--accent)", flexShrink: 0 }} /></GameIcon>
            <span className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--foreground)" }}>
              {group}
            </span>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="relative mb-2">
          <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
          <motion.input
            type="text"
            placeholder="Buscar grupo..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAdding(false); }}
            className="w-full rounded-xl py-3 pr-4 text-sm outline-none"
            style={{ paddingLeft: "38px", background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
            whileFocus={{ scale: 1.015, y: -1, borderColor: "var(--primary)", boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
          />
        </div>

        <div
          className="rounded-2xl overflow-hidden mb-3"
          style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "200px", overflowY: "auto" }}
        >
          {filtered.map((g, i) => (
            <button
              key={g}
              onClick={() => { setGroup(g); setQuery(""); setAdding(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style={{
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                background: group === g ? "var(--primary-alpha-10)" : "transparent",
              }}
            >
              <MapPin size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>{g}</span>
              {group === g && <Check size={13} style={{ color: "var(--primary)" }} />}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nenhum grupo encontrado</p>
            </div>
          )}
        </div>

        {adding ? (
          <div className="flex flex-col gap-2">
            <motion.input
              type="text"
              placeholder="Nome do seu grupo"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid var(--primary)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              whileFocus={{ scale: 1.015, boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setAdding(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Cancelar</button>
              <button onClick={() => { if (newGroup) { setGroup(newGroup); setAdding(false); setNewGroup(""); } }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Adicionar</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setAdding(true)}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
              style={{ background: "var(--card)", border: "1px dashed var(--border)", color: "var(--muted-foreground)" }}
            >
              <Plus size={15} />
              Meu grupo não está na lista
            </button>
            <button
              onClick={() => { setGroup("Sem grupo de jovens"); setQuery(""); }}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                background: group === "Sem grupo de jovens" ? "var(--muted)" : "transparent",
                border: "1px solid var(--border)",
                color: group === "Sem grupo de jovens" ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {group === "Sem grupo de jovens" && <Check size={14} style={{ color: "var(--primary)" }} />}
              Não tenho grupo de jovens
            </button>
          </div>
        )}
      </div>

      <PrimaryButton onClick={() => onDone(email)} disabled={!valid}>
        Criar conta
      </PrimaryButton>
    </div>
  );
}

// ─── VERIFY SCREEN (email + OTP merged) ───────────────────────────────────────

function VerifyScreen({
  email, onNext, onBack, animDir,
}: {
  email: string; onNext: (code: string) => Promise<void>; onBack: () => void; animDir: AnimDir;
}) {
  const masked = email.replace(/^(.)(.*)(@.*)$/, (_, a, _b, c) => a + "***" + c);
  const [digits, setDigits]       = useState(["", "", "", "", "", ""]);
  const [timer, setTimer]         = useState(60);
  const [allFilled, setAllFilled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next  = [...digits];
    next[index] = digit;
    setDigits(next);
    setAllFilled(next.every((d) => d !== ""));
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submitCode() {
    if (!allFilled || verifying) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await onNext(digits.join(""));
    } catch (error) {
      setVerifyError(requestErrorMessage(error));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div
      key="verify"
      className="flex flex-col min-h-dvh px-6 pt-12 pb-10"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      <BackButton onClick={onBack} />

      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
          Verifique seu e-mail
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Enviamos um código de 6 dígitos para{" "}
          <span className="font-semibold" style={{ color: "var(--accent)" }}>{masked}</span>.
          Verifique também o spam.
        </p>
      </div>

      <div
        className="flex gap-2.5 justify-center mb-5"
        style={allFilled ? { animation: "otpPulse 400ms ease-out" } : undefined}
      >
        {digits.map((digit, i) => (
          <motion.input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 rounded-xl text-center text-xl font-bold outline-none"
            style={{
              background: digit ? "var(--primary-alpha-15)" : "var(--input-background)",
              color:      digit ? "var(--primary)"          : "var(--foreground)",
              border:     `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
              transition: "background 150ms ease, border-color 150ms ease",
            }}
            animate={digit ? { scale: [1, 1.16, 1.04], y: [0, -3, 0] } : { scale: 1, y: 0 }}
            whileFocus={{ scale: 1.08, y: -2, boxShadow: "0 8px 20px var(--primary-alpha-20)" }}
            transition={{ duration: 0.28, times: [0, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      <div className="text-center mb-8">
        {timer > 0 ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Reenviar em <span className="font-semibold" style={{ color: "var(--foreground)" }}>{timer}s</span>
          </p>
        ) : (
          <button
            className="text-sm font-semibold underline"
            style={{ color: "var(--primary)" }}
            onClick={() => setTimer(60)}
          >
            Reenviar código
          </button>
        )}
      </div>

      {verifyError ? <p className="text-sm text-center mb-3" style={{ color: "var(--secondary)" }}>{verifyError}</p> : null}
      <PrimaryButton onClick={submitCode} disabled={!allFilled || verifying}>
        Verificar código
      </PrimaryButton>
    </div>
  );
}

// ─── GROUP SCREEN ─────────────────────────────────────────────────────────────

function GroupScreen({
  onNext, onBack, animDir, initialGroup = "",
}: {
  onNext: (group: string, groupId?: string) => Promise<void>;
  onBack: () => void;
  animDir: AnimDir;
  initialGroup?: string;
}) {
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(env.useMocks ? "Grupo Chama Viva – Bairro Alto" : initialGroup);
  const [adding, setAdding]     = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [groupsError, setGroupsError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (env.useMocks) return;
    const search = query.trim();
    if (!search) return;
    const session = storage.getSession();
    if (!session) return;

    let active = true;
    const timer = window.setTimeout(() => {
      groupsApi.search(search, session.identityToken)
        .then((groups) => {
          if (active) {
            setApiGroups(groups);
            setGroupsError("");
          }
        })
        .catch((error) => {
          if (active) setGroupsError(requestErrorMessage(error));
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const filtered = env.useMocks
    ? YOUTH_GROUPS.filter((g) => g.toLowerCase().includes(query.toLowerCase()))
    : query.trim() ? apiGroups.map((group) => group.groupName) : [];

  async function confirmGroup() {
    if (!selected || confirming) return;
    setConfirming(true);
    setGroupsError("");
    try {
      const groupId = apiGroups.find((group) => group.groupName === selected)?.id;
      await onNext(selected, groupId);
    } catch (error) {
      setGroupsError(requestErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div
      key="group"
      className="flex flex-col min-h-dvh px-6 pt-12 pb-10"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      <BackButton onClick={onBack} />

      <div className="mt-6 mb-5">
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
          Seu grupo jovem
        </h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Confirme ou selecione seu grupo de juventude
        </p>
      </div>

      <AnimatePresence>
      {selected && !adding && (
        <motion.div
          className="rounded-xl p-3 mb-4 flex items-center gap-3"
          style={{ background: "var(--accent-alpha-10)", border: "1.5px solid var(--accent-alpha-30)" }}
          initial={{ opacity: 0, scale: 0.96, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
        >
          <GameIcon active><Check size={15} style={{ color: "var(--accent)", flexShrink: 0 }} /></GameIcon>
          <span className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--foreground)" }}>
            {selected}
          </span>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="relative mb-2">
        <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
        <motion.input
          type="text"
          placeholder="Buscar grupo..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setApiGroups([]);
            setGroupsError("");
            setAdding(false);
          }}
          className="w-full rounded-xl py-3 pr-4 text-sm outline-none"
          style={{ paddingLeft: "38px", background: "var(--input-background)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          whileFocus={{ scale: 1.015, y: -1, borderColor: "var(--primary)", boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
        />
      </div>

      <div
        className="rounded-2xl overflow-hidden mb-4"
        style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "240px", overflowY: "auto" }}
      >
        {groupsError ? <p className="px-4 py-3 text-sm" style={{ color: "var(--secondary)" }}>{groupsError}</p> : null}
        {filtered.map((group, i) => (
          <button
            key={group}
            onClick={() => { setSelected(group); setQuery(""); setAdding(false); }}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            style={{
              borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
              background:   selected === group ? "var(--primary-alpha-10)" : "transparent",
            }}
          >
            <MapPin size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
            <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>{group}</span>
            {selected === group && <Check size={13} style={{ color: "var(--primary)" }} />}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Nenhum grupo encontrado</p>
          </div>
        )}
      </div>

      {adding ? (
        <div className="mb-4 flex flex-col gap-2">
          <motion.input
            type="text"
            placeholder="Nome do seu grupo"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "var(--input-background)", color: "var(--foreground)", border: "1.5px solid var(--primary)" }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            whileFocus={{ scale: 1.015, boxShadow: "0 8px 22px var(--primary-alpha-15)" }}
          />
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Cancelar</button>
            <button onClick={() => { if (newGroup) { setSelected(newGroup); setAdding(false); } }} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>Adicionar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
            style={{ border: "1px dashed var(--border)", color: "var(--muted-foreground)", background: "transparent" }}
          >
            <Plus size={15} /> Não encontrei meu grupo
          </button>
          <button
            onClick={() => { setSelected("Sem grupo de jovens"); setQuery(""); }}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{
              background: selected === "Sem grupo de jovens" ? "var(--muted)" : "transparent",
              border: "1px solid var(--border)",
              color: selected === "Sem grupo de jovens" ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {selected === "Sem grupo de jovens" && <Check size={14} style={{ color: "var(--primary)" }} />}
            Não tenho grupo de jovens
          </button>
        </div>
      )}

      <PrimaryButton onClick={confirmGroup} disabled={!selected || confirming}>
        {confirming ? "Salvando..." : "Confirmar grupo"}
      </PrimaryButton>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────

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

function HomeScreen({ user, animDir }: { user: UserData; animDir: AnimDir }) {
  return (
    <div
      key="home"
      className="absolute inset-0 overflow-y-auto pb-28"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      {/* Header */}
      <div
        className="px-6 pt-12 pb-5"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
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

function RankRow({
  position, name, group, points, isUser, isLast, showGroupLabel = true,
}: {
  position: number; name: string; group: string; points: number;
  isUser?: boolean; isLast?: boolean; showGroupLabel?: boolean;
}) {
  const isTop3 = position <= 3;
  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{
        paddingTop:    isTop3 ? "18px" : "14px",
        paddingBottom: isTop3 ? "18px" : "14px",
        borderBottom:  isLast ? "none" : "1px solid var(--border)",
        background:    isUser ? "var(--primary-alpha-10)" : isTop3 ? TOP3_BG[position] : "transparent",
      }}
    >
      <MedalBadge position={position} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isUser ? "var(--primary)" : "var(--foreground)" }}>
          {name}{isUser && " 👤"}
        </p>
        {showGroupLabel && (
          <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{group}</p>
        )}
      </div>
      <span className="text-sm font-bold flex-shrink-0" style={{ color: isUser ? "var(--primary)" : "var(--accent)" }}>
        {points} pts
      </span>
    </div>
  );
}

function UserPositionBanner({
  rank, label, sublabel, points,
}: {
  rank: number; label: string; sublabel?: string; points: number;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: "var(--primary)", boxShadow: "0 4px 20px var(--primary-alpha-40)" }}
    >
      <span className="text-white font-black text-[36px]" style={{ minWidth: "36px", fontVariantNumeric: "tabular-nums" }}>
        #{rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{label}</p>
        {sublabel && <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{sublabel}</p>}
      </div>
      <span className="text-white font-bold text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
        {points} pts
      </span>
    </div>
  );
}

function GameScreen({ user, animDir }: { user: UserData; animDir: AnimDir }) {
  const [tab, setTab]         = useState<GameTab>("overview");
  const [rankTab, setRankTab] = useState<RankingTab>("individual");
  const [qrOpen, setQrOpen]   = useState(false);
  const count = useCountUp(user.points, 900);
  const [showQrTooltip, setShowQrTooltip] = useState(() => {
    try { return !localStorage.getItem("dnj_qr_seen"); } catch { return true; }
  });

  function dismissTooltip() {
    try { localStorage.setItem("dnj_qr_seen", "1"); } catch { /* noop */ }
    setShowQrTooltip(false);
  }

  const userEntry      = INDIVIDUAL_RANKING.find((e) => e.isUser);
  const userGroupEntry = user.group
    ? GROUP_RANKING.find((g) => g.name.toLowerCase().includes(user.group.toLowerCase().split(" ")[0]))
    : null;
  const userGroupRank  = userGroupEntry ? GROUP_RANKING.indexOf(userGroupEntry) + 1 : null;

  return (
    <div
      key="game"
      className="absolute inset-0 flex flex-col pb-28"
      style={{ background: "var(--background)", ...animStyle(animDir) }}
    >
      {/* Header */}
      <div
        className="px-6 pt-12 pb-4 flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4" style={{ marginTop: "20px" }}>
          <CrossLogo />
          <div className="text-right">
            <span
              className="font-black leading-none"
              style={{ fontSize: "2.25rem", color: "var(--accent)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}
            >
              {count}
            </span>
            <span className="font-semibold ml-1" style={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>pts</span>
          </div>
        </div>

        <div className="flex rounded-xl p-1" style={{ background: "var(--muted)" }}>
          {([
            { id: "overview" as GameTab, label: "Meus Pontos" },
            { id: "ranking"  as GameTab, label: "Ranking"     },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? "var(--primary)" : "transparent",
                color:      tab === t.id ? "white" : "var(--muted-foreground)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {tab === "overview" && (
          <div className="px-5 pt-5 flex flex-col gap-5 pb-24">

            {/* Ranking summary — onboarding or live position */}
            {showQrTooltip ? (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center"
                style={{
                  background: "var(--card)",
                  border:     "1px solid var(--border)",
                  padding:    "32px 24px",
                  animation:  "fadeUp 260ms cubic-bezier(0.22,1,0.36,1) both",
                }}
              >
                <div
                  style={{
                    width: "52px", height: "52px", borderRadius: "14px",
                    background: "var(--primary-alpha-15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <GameIcon active><QrCode size={26} style={{ color: "var(--primary)" }} /></GameIcon>
                </div>
                <p
                  className="font-bold mb-2"
                  style={{ fontSize: "1.0625rem", color: "var(--foreground)", lineHeight: 1.35 }}
                >
                  Comece a jogar aqui!
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Procure o QR code para participar
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div
                  className="flex"
                  style={{ borderBottom: userGroupRank ? "1px solid var(--border)" : "none" }}
                >
                  {/* Individual rank */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center py-5"
                    style={{ borderRight: userGroupRank ? "1px solid var(--border)" : "none" }}
                  >
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                      Ranking Individual
                    </p>
                    <span
                      className="font-black leading-none"
                      style={{ fontSize: "3rem", color: "var(--primary)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
                    >
                      #{user.rankPosition}
                    </span>
                    <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      entre {INDIVIDUAL_RANKING.length} participantes
                    </p>
                  </div>

                  {/* Group rank — only if user has group */}
                  {userGroupRank && (
                    <div className="flex-1 flex flex-col items-center justify-center py-5">
                      <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>
                        Ranking do Grupo
                      </p>
                      <span
                        className="font-black leading-none"
                        style={{ fontSize: "3rem", color: "var(--chart-2)", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
                      >
                        #{userGroupRank}
                      </span>
                      <p className="text-xs mt-1 text-center px-2 truncate max-w-full" style={{ color: "var(--muted-foreground)" }}>
                        {userGroupEntry?.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <h3 className="text-sm font-semibold mb-3 px-1" style={{ color: "var(--foreground)" }}>
                Histórico de pontos
              </h3>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                {POINTS_LOG.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ borderBottom: i < POINTS_LOG.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}
                    >
                      <PointIcon type={entry.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {entry.label}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.time}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>
                      +{entry.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking" && (
          <div className="px-5 pt-4 flex flex-col gap-4 pb-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {(["individual", "grupos"] as RankingTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRankTab(t)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: rankTab === t ? "var(--primary-alpha-15)" : "var(--card)",
                    color:      rankTab === t ? "var(--primary)" : "var(--muted-foreground)",
                    border:     `1px solid ${rankTab === t ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  {t === "individual" ? "Individual" : "Grupos"}
                </button>
              ))}
            </div>

            {/* User position banner — TOP of list */}
            {rankTab === "individual" && userEntry && (
              <UserPositionBanner
                rank={user.rankPosition}
                label="Sua posição"
                sublabel={user.group || "Sem grupo"}
                points={user.points}
              />
            )}
            {rankTab === "grupos" && userGroupRank && userGroupEntry && (
              <UserPositionBanner
                rank={userGroupRank}
                label={userGroupEntry.name}
                sublabel={`${userGroupEntry.members} membros`}
                points={userGroupEntry.points}
              />
            )}

            {/* List */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {rankTab === "individual"
                ? INDIVIDUAL_RANKING.slice(0, 30).map((entry, i, arr) => (
                    <RankRow
                      key={entry.id}
                      position={i + 1}
                      name={entry.name}
                      group={entry.group}
                      points={entry.points}
                      isUser={entry.isUser}
                      isLast={i === arr.length - 1}
                    />
                  ))
                : GROUP_RANKING.slice(0, 10).map((entry, i, arr) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4"
                      style={{
                        paddingTop:    i < 3 ? "18px" : "14px",
                        paddingBottom: i < 3 ? "18px" : "14px",
                        borderBottom:  i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        background:    i < 3 ? TOP3_BG[i + 1] : "transparent",
                      }}
                    >
                      <MedalBadge position={i + 1} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>{entry.name}</p>
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{entry.members} membros</p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "var(--accent)" }}>
                        {entry.points} pts
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Floating QR button + first-visit tooltip */}
      <div style={{ position: "absolute", bottom: "100px", right: "20px", zIndex: 30, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>

        {showQrTooltip && (
          <div
            style={{ animation: "fadeUp 260ms cubic-bezier(0.22,1,0.36,1) both" }}
          >
            <div
              style={{
                background:   "var(--foreground)",
                color:        "var(--background)",
                borderRadius: "10px",
                padding:      "8px 14px",
                fontSize:     "0.8125rem",
                fontWeight:   "var(--font-weight-bold)" as React.CSSProperties["fontWeight"],
                whiteSpace:   "nowrap",
                boxShadow:    "0 4px 16px rgba(0,0,0,0.25)",
                position:     "relative",
              }}
            >
              Escaneie aqui
              {/* Arrow pointing down-right */}
              <span style={{
                position:    "absolute",
                bottom:      "-6px",
                right:       "22px",
                width:       0,
                height:      0,
                borderLeft:  "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop:   "6px solid var(--foreground)",
              }} />
            </div>
          </div>
        )}

        <button
          onClick={() => { dismissTooltip(); setQrOpen(true); }}
          onTouchStart={showQrTooltip ? dismissTooltip : undefined}
          className="transition-all active:scale-90"
          style={{
            width:        "60px",
            height:       "60px",
            borderRadius: "18px",
            background:   "var(--primary)",
            boxShadow:    "0 6px 24px var(--primary-alpha-40)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            animation:    showQrTooltip ? "haloPulse 2s ease-in-out infinite" : "none",
          }}
        >
          <GameIcon active={showQrTooltip}><QrCode size={26} color="white" /></GameIcon>
        </button>
      </div>

      <AnimatePresence>{qrOpen && <QRModal onClose={() => setQrOpen(false)} />}</AnimatePresence>
    </div>
  );
}

// ─── QUEUE SCREEN (Fila Esperança) ────────────────────────────────────────────

function QueueScreen({ animDir }: { animDir: AnimDir }) {
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

function AccountScreen({
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

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export function DnjApp() {
  const reduceMotion = useReducedMotion();
  const network = useNetworkStatus();
  const pwa = usePwa();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return migrateThemeStorage() ?? "light";
  });

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      try { storage.setTheme(next); } catch { /* noop */ }
      return next;
    });
  }

  const [screen, setScreen]         = useState<Screen>("login");
  const [prevScreen, setPrevScreen] = useState<Screen>("login");
  const [emailVal, setEmailVal]     = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [user, setUser] = useState<UserData>({
    name: "João Paulo", cpf: "", email: "", group: "",
    points: 150, rankPosition: 9,
  });
  const [offlineSnapshotCapturedAt, setOfflineSnapshotCapturedAt] = useState<string | null>(null);
  const restoredSnapshot = useRef(false);

  const navigate = useCallback((next: Screen) => {
    setPrevScreen(screen);
    setScreen(next);
  }, [screen]);

  const handleLogin = useCallback(async (email: string, cpf: string) => {
    setEmailVal(email);
    setUser((u) => ({ ...u, email, cpf }));
    if (!env.useMocks) {
      await authApi.requestCode(email, cpf.replace(/\D/g, ""));
    }
    navigate("verify");
  }, [navigate]);

  const handleVerification = useCallback(async (code: string) => {
    if (env.useMocks) {
      navigate("group");
      return;
    }

    const response = await authApi.verifyCode(emailVal, code);
    const apiUser = mapApiUser(response);
    storage.setSession({ user: apiUser, identityToken: response.identityToken });
    setUser({
      name: apiUser.name,
      cpf: apiUser.document,
      email: apiUser.email,
      group: apiUser.group?.groupName ?? "",
      points: apiUser.points,
      rankPosition: apiUser.rankPosition,
    });
    navigate("group");
  }, [emailVal, navigate]);

  const handleGroupConfirm = useCallback(async (group: string, groupId?: string) => {
    let confirmedGroup = group;
    if (!env.useMocks) {
      const session = storage.getSession();
      if (!session) throw new ApiError("Sessão não encontrada. Entre novamente.", 401);
      const updatedUser = await groupsApi.updateUserGroup(
        session.user.id,
        groupId ? { groupId } : { groupName: group },
        session.identityToken,
      );
      confirmedGroup = updatedUser.group?.groupName ?? group;
      storage.setSession({
        identityToken: session.identityToken,
        user: { ...session.user, group: updatedUser.group },
      });
    }
    setUser((current) => ({ ...current, group: confirmedGroup }));
    navigate("home");
  }, [navigate]);

  const animDir = getAnimDir(prevScreen, screen);
  const isMain  = ["home", "game", "queue", "account"].includes(screen);

  useEffect(() => {
    if (network.isOnline || restoredSnapshot.current || screen !== "login") return;
    restoredSnapshot.current = true;
    const snapshot = readOfflineSnapshot();
    if (!snapshot) return;
    setUser({ ...snapshot.user, cpf: "", email: "" });
    setPrevScreen("login");
    setScreen(snapshot.lastMainScreen);
    setOfflineSnapshotCapturedAt(snapshot.capturedAt);
  }, [network.isOnline, screen]);

  useEffect(() => {
    if (!network.isOnline || !isMain) return;
    writeOfflineSnapshot({
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      lastMainScreen: screen as "home" | "game" | "queue" | "account",
      user: {
        name: user.name,
        group: user.group,
        points: user.points,
        rankPosition: user.rankPosition,
      },
    });
  }, [isMain, network.isOnline, screen, user.group, user.name, user.points, user.rankPosition]);

  return (
    <div
      className={theme === "dark" ? "dark" : ""}
      style={{ minHeight: "100dvh", background: theme === "dark" ? "#050e0e" : "#e8e8e8", display: "flex", justifyContent: "center", alignItems: "flex-start" }}
    >
      <div
        className="game-shell relative w-full max-w-md overflow-hidden"
        style={{ minHeight: "100dvh", background: "var(--background)" }}
      >
        <div className="game-atmosphere" aria-hidden="true"><span /><span /><span /></div>
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className={isMain ? "absolute inset-0" : "relative min-h-dvh"}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: animDir === "left" ? -28 : animDir === "right" ? 28 : 0, y: animDir === "up" ? 18 : 0, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {screen === "login"           && <LoginScreen    onNext={handleLogin} onRegister={() => navigate("register")} animDir={animDir} />}
            {screen === "register"        && <RegisterScreen onBack={() => navigate("login")} onDone={(em) => { setRegisterEmail(em); navigate("register-verify"); }} animDir={animDir} />}
            {screen === "register-verify" && <VerifyScreen  email={registerEmail} onNext={async () => { navigate("home"); }} onBack={() => navigate("register")} animDir={animDir} />}
            {screen === "verify"          && <VerifyScreen  email={emailVal} onNext={handleVerification} onBack={() => navigate("login")}  animDir={animDir} />}
            {screen === "group"   && <GroupScreen   onNext={handleGroupConfirm} onBack={() => navigate("verify")} animDir={animDir} initialGroup={user.group} />}
            {screen === "home"    && <HomeScreen    user={user}                    animDir={animDir} />}
            {screen === "game"    && <GameScreen    user={user}                    animDir={animDir} />}
            {screen === "queue"   && <QueueScreen                                  animDir={animDir} />}
            {screen === "account" && <AccountScreen user={user} onLogout={() => { storage.clearSession(); clearOfflineSnapshot(); navigate("login"); }} theme={theme} onToggleTheme={toggleTheme} animDir={animDir} />}
          </motion.div>
        </AnimatePresence>

        {isMain && <TopBar theme={theme} />}
        {!network.isOnline && offlineSnapshotCapturedAt && (
          <p
            className="absolute left-3 right-3 top-14 z-40 rounded-xl border px-3 py-2 text-center text-xs font-medium"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Conteúdo salvo em {new Date(offlineSnapshotCapturedAt).toLocaleString("pt-BR")} · somente leitura
          </p>
        )}
        {isMain && <BottomNav active={screen} onNavigate={navigate} />}
        <ConnectivityStatus
          isOnline={network.isOnline}
          onApplyUpdate={pwa.applyUpdate}
          pwaStatus={pwa.status}
        />
      </div>
    </div>
  );
}
