"use client";

import { useEffect, useState } from "react";
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
  const [overview, setOverview] = useState<{ activeUsers: number; pendingModeration: number; interactionsToday: number } | null>(null);

  useEffect(() => { void fetch("/api/admin/overview", { cache: "no-store" }).then(async (response) => response.ok ? setOverview(await response.json()) : null); }, []);

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

        {panel === "Visão geral" ? <Overview onNavigate={setPanel} overview={overview} /> : panel === "Moderação" ? <Moderation /> : panel === "Notificações" ? <Notifications /> : panel === "Usuários" ? <Users /> : panel === "Atividade" ? <Activity /> : <Placeholder panel={panel} />}
      </section>
    </main>
  );
}

function Overview({ onNavigate, overview }: { onNavigate: (panel: Panel) => void; overview: { activeUsers: number; pendingModeration: number; interactionsToday: number } | null }) {
  return <div className={styles.dashboard}>
    <section className={styles.statusBar} aria-label="Estado do sistema"><span><i /> Sistemas operando normalmente</span><span>Atualizado agora · dados compartilhados</span></section>
    <section className={styles.metrics} aria-label="Métricas de operação">
      <Metric value={overview ? String(overview.activeUsers) : "—"} label="Participantes ativos" detail="nos últimos 15 minutos" />
      <Metric value={overview ? String(overview.interactionsToday) : "—"} label="Interações hoje" detail="ações registradas hoje" />
      <Metric value={overview ? String(overview.pendingModeration) : "—"} label="Itens para moderar" detail="requerem sua atenção" attention />
      <Metric value="—" label="Sucesso nos logins" detail="métrica em preparação" />
    </section>
    <section className={styles.columns}>
      <div className={styles.activity}><div className={styles.sectionTitle}><div><p>Agora na operação</p><h2>Atividade recente</h2></div><button onClick={() => onNavigate("Atividade")}>Ver tudo <ChevronRight size={16} /></button></div>
        <ol>{activity.map(([title, description, time]) => <li key={title}><span className={styles.activityDot} /><div><strong>{title}</strong><p>{description}</p></div><time>{time}</time></li>)}</ol>
      </div>
      <div className={styles.attention}><div className={styles.sectionTitle}><div><p>Requer decisão</p><h2>Fila de moderação</h2></div><CircleAlert size={20} /></div><p>{overview ? `${overview.pendingModeration} publicação(ões) aguardam revisão.` : "Carregando fila de revisão."}</p><button onClick={() => onNavigate("Moderação")}>Abrir moderação <ChevronRight size={16} /></button></div>
    </section>
    <section className={styles.quickActions}><button onClick={() => onNavigate("Notificações")}><Bell size={20} /><span><strong>Enviar comunicado</strong><small>Notifique participantes por segmento</small></span><ChevronRight size={17} /></button><button onClick={() => onNavigate("Usuários")}><UsersRound size={20} /><span><strong>Consultar participantes</strong><small>Encontre perfis, grupos e status</small></span><ChevronRight size={17} /></button><button><Gamepad2 size={20} /><span><strong>Games e eventos</strong><small>Em breve nesta central</small></span><ChevronRight size={17} /></button></section>
  </div>;
}

function Moderation() {
  const [posts, setPosts] = useState<Array<{ id: string; caption: string | null; created_at: string; test_users: { display_name: string } | null }> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/admin/moderation", { cache: "no-store" }).then(async (response) => { if (!response.ok) { setError("Não foi possível carregar a fila."); return; } const body = await response.json() as { posts: NonNullable<typeof posts> }; setPosts(body.posts); }).catch(() => setError("Não foi possível carregar a fila.")); }, []);
  async function decide(id: string, decision: "approved" | "rejected") { const response = await fetch("/api/admin/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) }); if (!response.ok) { setError("A decisão não foi salva. Tente novamente."); return; } setPosts((current) => current?.filter((post) => post.id !== id) ?? null); }
  if (error) return <section className={styles.placeholder}><CircleAlert size={30} /><h2>Fila indisponível</h2><p>{error}</p></section>;
  if (!posts) return <section className={styles.placeholder}><Clock3 size={30} /><h2>Carregando moderação</h2><p>Buscando publicações pendentes no banco compartilhado.</p></section>;
  if (!posts.length) return <section className={styles.placeholder}><ShieldCheck size={30} /><h2>Fila limpa</h2><p>Não há publicações aguardando revisão agora.</p></section>;
  return <section className={styles.activity}><div className={styles.sectionTitle}><div><p>Decida antes de publicar</p><h2>{posts.length} publicação(ões) pendente(s)</h2></div></div><ol>{posts.map((post) => <li key={post.id}><span className={styles.activityDot} /><div><strong>{post.test_users?.display_name ?? "Participante"}</strong><p>{post.caption || "Publicação sem legenda"}</p></div><span><button onClick={() => decide(post.id, "approved")}>Aprovar</button><button onClick={() => decide(post.id, "rejected")}>Recusar</button></span></li>)}</ol></section>;
}

function Notifications() {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [sending, setSending] = useState(false);
  async function send(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSending(true); setMessage(""); const response = await fetch("/api/admin/notifications", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title,body,target:"all"}) }); const result = await response.json() as { delivered?:number; total?:number; error?:string }; setSending(false); setMessage(response.ok ? `Campanha enviada para ${result.delivered} de ${result.total} dispositivo(s).` : result.error ?? "Não foi possível enviar."); if(response.ok){setTitle("");setBody("");} }
  return <section className={styles.activity}><div className={styles.sectionTitle}><div><p>Push Notification</p><h2>Enviar comunicado</h2></div><Bell size={20}/></div><form onSubmit={send} style={{display:"grid",gap:12,marginTop:22,maxWidth:620}}><label style={{display:"grid",gap:6}}>Título<input value={title} onChange={(event)=>setTitle(event.target.value)} maxLength={80} required /></label><label style={{display:"grid",gap:6}}>Mensagem<textarea value={body} onChange={(event)=>setBody(event.target.value)} maxLength={280} required rows={4}/></label><button disabled={sending} style={{width:"fit-content"}}>{sending?"Enviando…":"Enviar Push para todos"}</button>{message&&<p role="status">{message}</p>}</form></section>;
}

function Users() {
 const [users,setUsers]=useState<Array<{id:string;display_name:string;email:string|null;points:number;last_seen_at:string}>|null>(null);
 useEffect(()=>{void fetch("/api/admin/users").then(async r=>r.ok&&setUsers((await r.json() as {users:NonNullable<typeof users>}).users));},[]);
 if(!users)return <section className={styles.placeholder}><UsersRound size={30}/><h2>Carregando participantes</h2></section>;
 return <section className={styles.activity}><div className={styles.sectionTitle}><div><p>Dados compartilhados</p><h2>{users.length} participante(s)</h2></div></div><ol>{users.map((user,index)=><li key={user.id}><span className={styles.activityDot}/><div><strong>#{index+1} · {user.display_name}</strong><p>{user.email??"Sem e-mail"} · {user.points} pontos</p></div><time>{new Date(user.last_seen_at).toLocaleString("pt-BR")}</time></li>)}</ol></section>;
}

function Activity() {
 const [items,setItems]=useState<Array<{id:number;event_type:string;created_at:string;test_users:{display_name:string}|null}>|null>(null);
 useEffect(()=>{void fetch("/api/admin/activity").then(async r=>r.ok&&setItems((await r.json() as {activity:NonNullable<typeof items>}).activity));},[]);
 if(!items)return <section className={styles.placeholder}><Clock3 size={30}/><h2>Carregando atividade</h2></section>;
 return <section className={styles.activity}><div className={styles.sectionTitle}><div><p>Auditoria</p><h2>Eventos recentes</h2></div></div><ol>{items.map(item=><li key={item.id}><span className={styles.activityDot}/><div><strong>{item.event_type}</strong><p>{item.test_users?.display_name??"Sistema"}</p></div><time>{new Date(item.created_at).toLocaleString("pt-BR")}</time></li>)}</ol></section>;
}

function Metric({ value, label, detail, attention = false }: { value: string; label: string; detail: string; attention?: boolean }) {
  return <article className={attention ? `${styles.metric} ${styles.metricAttention}` : styles.metric}><strong>{value}</strong><span>{label}</span><small>{detail}</small></article>;
}

function Placeholder({ panel }: { panel: Panel }) {
  const Icon = panel === "Moderação" ? ShieldCheck : panel === "Notificações" ? Bell : panel === "Usuários" ? UsersRound : MessageSquareMore;
  return <section className={styles.placeholder}><Icon size={30} /><h2>{panel} está pronto para integrar</h2><p>Este módulo já tem navegação isolada. Quando a API administrativa estiver disponível, conectaremos aqui os dados e ações reais.</p></section>;
}
