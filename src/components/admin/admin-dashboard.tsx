"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, CircleAlert, Clock3, LayoutDashboard, LogOut, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import type { AdminPanel, AdminSession } from "@/types/admin";
import styles from "./admin-dashboard.module.css";

type Space = { id: string; name: string; slug: string; mapReference: string | null };
type Activity = { id: string; name: string; slug: string; kind: string; status: string; description: string | null; spaceId: string | null; startsAt: string | null; endsAt: string | null; checkInPoints: number; momentPoints: number; cooldownSeconds: number; allowsMoment: boolean };
type Staff = { id: string; name: string; role: "EVENT_MANAGER"; onboardingComplete: boolean };
type Moderation = { momentId: string; imageUrl: string; capturedAt: string; participantName: string; activity: { id: string; name: string } | null; pointsAwarded: number; photoStatus: string; availableActions: Array<"deny_points" | "delete_photo"> };

const navigation: Array<{ label: AdminPanel; icon: typeof LayoutDashboard }> = [
  { label: "Gestores", icon: UserRoundCog },
  { label: "Atividades", icon: CalendarClock },
  { label: "Espaços", icon: UsersRound },
  { label: "Moderação", icon: ShieldCheck },
  { label: "Notificações", icon: Bell },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v2${path}`, { cache: "no-store", credentials: "include", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { message?: string }).message ?? "Falha ao carregar dados.");
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function AdminDashboard({ session, onExit }: { session: AdminSession; onExit: () => void }) {
  const [panel, setPanel] = useState<AdminPanel>("Gestores");
  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE", credentials: "include" });
    onExit();
  }
  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span>DNJ</span><strong>Central de operação</strong><small>Admin global</small></div>
      <nav aria-label="Navegação administrativa" className={styles.navigation}>
        {navigation.map(({ label, icon: Icon }) => <button key={label} className={panel === label ? styles.activeNav : styles.navItem} onClick={() => setPanel(label)}><Icon size={17} />{label}</button>)}
      </nav>
      <button className={styles.exit} onClick={signOut}><LogOut size={17} />Sair</button>
    </aside>
    <section className={styles.content}>
      <header className={styles.header}><div><p className={styles.context}>DNJ 2026 · Administração</p><h1>{panel}</h1></div><div className={styles.admin}><span className={styles.avatar}>{session.name.slice(0, 1).toUpperCase()}</span><span><strong>{session.name}</strong><small>{session.email}</small></span></div></header>
      {panel === "Gestores" && <StaffList />}
      {panel === "Atividades" && <ActivityList />}
      {panel === "Espaços" && <SpaceList />}
      {panel === "Moderação" && <ModerationList />}
      {panel === "Notificações" && <Notifications />}
    </section>
  </main>;
}

function StaffList() {
  const [staff, setStaff] = useState<Staff[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { void api<{ data: Staff[] }>("/admin/staff").then((data) => setStaff(data.data)).catch(() => setError("Não foi possível carregar os gestores.")); }, []);
  if (error) return <Failure message={error} />;
  if (!staff) return <Loading />;
  return <section className={styles.activity}><SectionTitle kicker="Contas operacionais" title={`${staff.length} gestor(es)`} />{staff.length ? <ol>{staff.map((manager) => <li key={manager.id}><span className={styles.activityDot} /><div><strong>{manager.name}</strong><p>{manager.role} · {manager.onboardingComplete ? "cadastro concluído" : "cadastro pendente"}</p></div></li>)}</ol> : <Empty text="Nenhum gestor cadastrado." />}</section>;
}

function SpaceList() {
  const [spaces, setSpaces] = useState<Space[] | null>(null); const [error, setError] = useState(""); const [name, setName] = useState(""); const [slug, setSlug] = useState("");
  const load = useCallback(() => void api<{ data: Space[] }>("/admin/spaces").then((data) => setSpaces(data.data)).catch(() => setError("Não foi possível carregar os espaços.")), []);
  useEffect(load, [load]);
  async function create(event: FormEvent) { event.preventDefault(); try { await api("/admin/spaces", { method: "POST", body: JSON.stringify({ name, slug }) }); setName(""); setSlug(""); load(); } catch { setError("Não foi possível criar o espaço."); } }
  if (error && !spaces) return <Failure message={error} />;
  return <div className={styles.dashboard}><form className={styles.formCard} onSubmit={create}><SectionTitle kicker="Estrutura" title="Novo espaço" /><div className={styles.formGrid}><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label></div><div className={styles.formFooter}><button className={styles.primaryButton}>Criar espaço</button>{error && <p role="alert">{error}</p>}</div></form><section className={styles.activity}><SectionTitle kicker="Espaços" title="Locais cadastrados" />{!spaces ? <Loading /> : spaces.length ? <ol>{spaces.map((space) => <li key={space.id}><span className={styles.activityDot} /><div><strong>{space.name}</strong><p>{space.slug}{space.mapReference ? ` · ${space.mapReference}` : ""}</p></div></li>)}</ol> : <Empty text="Nenhum espaço cadastrado." />}</section></div>;
}

function ActivityList() {
  const [activities, setActivities] = useState<Activity[] | null>(null); const [error, setError] = useState(""); const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [kind, setKind] = useState("challenge");
  const load = useCallback(() => void api<{ data: Activity[] }>("/admin/activities").then((data) => setActivities(data.data)).catch(() => setError("Não foi possível carregar as atividades.")), []);
  useEffect(load, [load]);
  async function create(event: FormEvent) { event.preventDefault(); try { await api("/admin/activities", { method: "POST", body: JSON.stringify({ name, slug, kind, checkInPoints: 0, momentPoints: 0, cooldownSeconds: 0, allowsMoment: kind === "challenge" }) }); setName(""); setSlug(""); load(); } catch { setError("Não foi possível criar a atividade."); } }
  if (error && !activities) return <Failure message={error} />;
  return <div className={styles.dashboard}><form className={styles.formCard} onSubmit={create}><SectionTitle kicker="Programação" title="Nova atividade" /><div className={styles.formGrid}><label>Nome<input value={name} onChange={(event) => setName(event.target.value)} required /></label><label>Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="schedule">Agenda</option><option value="checkpoint">Check-in</option><option value="challenge">Desafio</option><option value="competitive">Competitiva</option><option value="live">Ao vivo</option></select></label></div><div className={styles.formFooter}><button className={styles.primaryButton}>Criar atividade</button>{error && <p role="alert">{error}</p>}</div></form><section className={styles.activity}><SectionTitle kicker="Catálogo" title="Atividades cadastradas" />{!activities ? <Loading /> : activities.length ? <ol>{activities.map((activity) => <li key={activity.id}><span className={styles.activityDot} /><div><strong>{activity.name}</strong><p>{activity.kind} · {activity.status} · {activity.checkInPoints} ponto(s) no check-in</p></div></li>)}</ol> : <Empty text="Nenhuma atividade cadastrada." />}</section></div>;
}

function ModerationList() {
  const [moments, setMoments] = useState<Moderation[] | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => void api<{ data: Moderation[] }>("/admin/moments/moderation").then((data) => setMoments(data.data)).catch(() => setError("Não foi possível carregar a fila de moderação.")), []);
  useEffect(load, [load]);
  async function decide(momentId: string, action: Moderation["availableActions"][number]) { try { await api(`/admin/moments/${momentId}/moderation`, { method: "POST", body: JSON.stringify({ action }) }); load(); } catch { setError("Não foi possível aplicar a moderação."); } }
  if (error && !moments) return <Failure message={error} />;
  return <section className={styles.activity}><SectionTitle kicker="Correções" title="Moderação de Momentos" />{error && <p role="alert">{error}</p>}{!moments ? <Loading /> : moments.length ? <ol>{moments.map((moment) => <li className={styles.moderationItem} key={moment.momentId}><span className={styles.activityDot} /><div><strong>{moment.participantName}</strong><p>{moment.activity?.name ?? "DNJ"} · {moment.pointsAwarded} pontos · {formatDate(moment.capturedAt)}</p></div><span className={styles.rowActions}>{moment.availableActions.map((action) => <button key={action} className={action === "delete_photo" ? styles.dangerButton : styles.ghostButton} onClick={() => decide(moment.momentId, action)}>{action === "delete_photo" ? "Excluir foto" : "Retirar pontos"}</button>)}</span></li>)}</ol> : <Empty text="Fila limpa. Não há Momentos para corrigir." />}</section>;
}

function Notifications() {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [sending, setSending] = useState(false);
  async function send(event: FormEvent) { event.preventDefault(); setSending(true); setMessage(""); try { const result = await api<{ recipientCount: string }>("/admin/notifications", { method: "POST", body: JSON.stringify({ title, body }) }); setTitle(""); setBody(""); setMessage(`Comunicado enviado para ${result.recipientCount} destinatário(s).`); } catch { setMessage("Não foi possível enviar o comunicado."); } finally { setSending(false); } }
  return <section className={styles.activity}><SectionTitle kicker="Comunicação" title="Enviar notificação" /><form className={styles.notificationForm} onSubmit={send}><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required /></label><label>Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={280} rows={4} required /></label><button className={styles.primaryButton} disabled={sending}>{sending ? "Enviando…" : "Enviar"}</button>{message && <p role="status">{message}</p>}</form></section>;
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) { return <div className={styles.sectionTitle}><div><p>{kicker}</p><h2>{title}</h2></div></div>; }
function Loading() { return <section className={styles.placeholder}><Clock3 size={27} /><p>Carregando dados operacionais…</p></section>; }
function Empty({ text }: { text: string }) { return <p className={styles.empty}>{text}</p>; }
function Failure({ message }: { message: string }) { return <section className={styles.placeholder}><CircleAlert size={28} /><h2>Dados indisponíveis</h2><p>{message}</p></section>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Sem data" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
