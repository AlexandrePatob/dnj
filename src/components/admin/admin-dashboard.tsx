"use client";

import { useState } from "react";
import {
  Bell, ChevronRight, CircleAlert, Clock3, Gamepad2, LayoutDashboard,
  LogOut, MessageSquareMore, ShieldCheck, UsersRound,
} from "lucide-react";
import type { AdminSession } from "@/types/admin";
import styles from "./admin-dashboard.module.css";

type Panel = "Visão geral" | "Moderação" | "Notificações" | "Usuários" | "Atividade";

const navigation: Array<{ label: Panel; icon: typeof LayoutDashboard }> = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Moderação", icon: ShieldCheck },
  { label: "Notificações", icon: Bell },
  { label: "Usuários", icon: UsersRound },
  { label: "Atividade", icon: Clock3 },
];

const activity = [
  ["Novo login", "Maria Eduarda entrou no DNJ Game", "agora"],
  ["Comentário sinalizado", "Aguardando revisão na Galeria", "há 4 min"],
  ["Missão concluída", "Grupo São José marcou presença", "há 12 min"],
];

export function AdminDashboard({ session, onExit }: { session: AdminSession; onExit: () => void }) {
  const [panel, setPanel] = useState<Panel>("Visão geral");

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    onExit();
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><span>DNJ</span><strong>Central de operação</strong></div>
        <nav aria-label="Navegação administrativa" className={styles.navigation}>
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={panel === label ? styles.activeNav : styles.navItem} onClick={() => setPanel(label)}>
              <Icon size={18} strokeWidth={2.1} /> {label}
            </button>
          ))}
        </nav>
        <button className={styles.exit} onClick={signOut}><LogOut size={18} /> Sair da central</button>
      </aside>

      <section className={styles.content}>
        <header className={styles.header}>
          <div><p className={styles.context}>DNJ 2026 · Operação ao vivo</p><h1>{panel}</h1></div>
          <div className={styles.admin}><span className={styles.avatar}>A</span><span><strong>{session.name}</strong><small>Administrador</small></span></div>
        </header>

        {panel === "Visão geral" ? <Overview onNavigate={setPanel} /> : <Placeholder panel={panel} />}
      </section>
    </main>
  );
}

function Overview({ onNavigate }: { onNavigate: (panel: Panel) => void }) {
  return <div className={styles.dashboard}>
    <section className={styles.statusBar} aria-label="Estado do sistema"><span><i /> Sistemas operando normalmente</span><span>Atualizado agora · dados simulados</span></section>
    <section className={styles.metrics} aria-label="Métricas de operação">
      <Metric value="184" label="Participantes ativos" detail="nos últimos 15 minutos" />
      <Metric value="27" label="Interações hoje" detail="comentários e reações" />
      <Metric value="3" label="Itens para moderar" detail="requerem sua atenção" attention />
      <Metric value="96%" label="Sucesso nos logins" detail="nas últimas 24 horas" />
    </section>
    <section className={styles.columns}>
      <div className={styles.activity}><div className={styles.sectionTitle}><div><p>Agora na operação</p><h2>Atividade recente</h2></div><button onClick={() => onNavigate("Atividade")}>Ver tudo <ChevronRight size={16} /></button></div>
        <ol>{activity.map(([title, description, time]) => <li key={title}><span className={styles.activityDot} /><div><strong>{title}</strong><p>{description}</p></div><time>{time}</time></li>)}</ol>
      </div>
      <div className={styles.attention}><div className={styles.sectionTitle}><div><p>Requer decisão</p><h2>Fila de moderação</h2></div><CircleAlert size={20} /></div><p>Há 3 publicações sinalizadas por participantes. Revise antes de liberar o mural.</p><button onClick={() => onNavigate("Moderação")}>Abrir moderação <ChevronRight size={16} /></button></div>
    </section>
    <section className={styles.quickActions}><button onClick={() => onNavigate("Notificações")}><Bell size={20} /><span><strong>Enviar comunicado</strong><small>Notifique participantes por segmento</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate("Usuários")}><UsersRound size={20} /><span><strong>Consultar participantes</strong><small>Encontre perfis, grupos e status</small></span><ChevronRight size={17} /></button><button><Gamepad2 size={20} /><span><strong>Games e eventos</strong><small>Em breve nesta central</small></span><ChevronRight size={17} /></button></section>
  </div>;
}

function Metric({ value, label, detail, attention = false }: { value: string; label: string; detail: string; attention?: boolean }) {
  return <article className={attention ? `${styles.metric} ${styles.metricAttention}` : styles.metric}><strong>{value}</strong><span>{label}</span><small>{detail}</small></article>;
}

function Placeholder({ panel }: { panel: Panel }) {
  const Icon = panel === "Moderação" ? ShieldCheck : panel === "Notificações" ? Bell : panel === "Usuários" ? UsersRound : MessageSquareMore;
  return <section className={styles.placeholder}><Icon size={30} /><h2>{panel} está pronto para integrar</h2><p>Este módulo já tem navegação isolada. Quando a API administrativa estiver disponível, conectaremos aqui os dados e ações reais.</p></section>;
}
