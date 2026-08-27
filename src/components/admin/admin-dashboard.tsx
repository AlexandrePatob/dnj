"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, CircleAlert, Clock3, LayoutDashboard, LogOut, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { apiMutation, apiRequest } from "@/lib/api/client";
import { PastoralQueueOverview } from "./pastoral-queue-overview";
import { deviceDateTimeToUtc, nowInDeviceDateTimeInput } from "@/lib/date-time";
import type { AdminPanel, AdminSession } from "@/types/admin";
import styles from "./admin-dashboard.module.css";

type Space = { id: string; name: string; slug: string; mapReference: string | null };
type Activity = { id: string; name: string; slug: string; kind: string; status: string; description: string | null; spaceId: string | null; startsAt: string | null; endsAt: string | null; checkInPoints: number; momentPoints: number; cooldownSeconds: number; allowsMoment: boolean };
type Staff = { id: string; name: string; role: "EVENT_MANAGER"; onboardingComplete: boolean };
type Moderation = { momentId: string; imageUrl: string; capturedAt: string; participantName: string; activity: { id: string; name: string } | null; pointsAwarded: number; photoStatus: string; availableActions: Array<"deny_points" | "delete_photo"> };

type DashboardPanel = AdminPanel | "Filas pastorais";
const navigation: Array<{ label: DashboardPanel; icon: typeof LayoutDashboard }> = [
  { label: "Gestores", icon: UserRoundCog },
  { label: "Atividades", icon: CalendarClock },
  { label: "Espaços", icon: UsersRound },
  { label: "Moderação", icon: ShieldCheck },
  { label: "Notificações", icon: Bell },
  { label: "Filas pastorais", icon: Clock3 },
];

type DashboardRequest = Omit<RequestInit, "body"> & { body?: unknown };
async function api<T>(path: string, init: DashboardRequest = {}): Promise<T> {
  const { body, method, ...options } = init;
  return method && method !== "GET"
    ? apiMutation<T>(path, { ...options, method, body })
    : apiRequest<T>(path, { ...options, method, body });
}

export function AdminDashboard({ session, onExit }: { session: AdminSession; onExit: () => void }) {
  const [panel, setPanel] = useState<DashboardPanel>("Gestores");
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
      {panel === "Filas pastorais" && <PastoralQueueOverview />}
    </section>
  </main>;
}

function StaffList() {
  const [staff, setStaff] = useState<Staff[] | null>(null); const [error, setError] = useState("");
  useEffect(() => { void api<{ data: Staff[] }>("/admin/staff?role=EVENT_MANAGER").then((data) => setStaff(data.data)).catch(() => setError("Não foi possível carregar os gestores.")); }, []);
  if (error) return <Failure message={error} />;
  if (!staff) return <Loading />;
  return <section className={styles.activity}><SectionTitle kicker="Contas operacionais" title={`${staff.length} gestor(es)`} />{staff.length ? <ol>{staff.map((manager) => <li key={manager.id}><span className={styles.activityDot} /><div><strong>{manager.name}</strong><p>{manager.role} · {manager.onboardingComplete ? "cadastro concluído" : "cadastro pendente"}</p></div></li>)}</ol> : <Empty text="Nenhum gestor cadastrado." />}</section>;
}

function SpaceList() {
  const [spaces, setSpaces] = useState<Space[] | null>(null); const [error, setError] = useState(""); const [name, setName] = useState(""); const [slug, setSlug] = useState("");
  const load = useCallback(() => void api<{ data: Space[] }>("/admin/spaces").then((data) => setSpaces(data.data)).catch(() => setError("Não foi possível carregar os espaços.")), []);
  useEffect(load, [load]);
  async function create(event: FormEvent) { event.preventDefault(); try { await api("/admin/spaces", { method: "POST", body: { name, slug: slugify(slug) } }); setName(""); setSlug(""); load(); } catch { setError("Não foi possível criar o espaço."); } }
  if (error && !spaces) return <Failure message={error} />;
  return <div className={styles.dashboard}><form className={styles.formCard} onSubmit={create}><SectionTitle kicker="Estrutura" title="Novo espaço" /><div className={styles.formGrid}><label>Nome<input value={name} onChange={(event) => { setName(event.target.value); setSlug(slugify(event.target.value)); }} required /></label><label>Slug<input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label></div><div className={styles.formFooter}><button className={styles.primaryButton}>Criar espaço</button>{error && <p role="alert">{error}</p>}</div></form><section className={styles.activity}><SectionTitle kicker="Espaços" title="Locais cadastrados" />{!spaces ? <Loading /> : spaces.length ? <ol>{spaces.map((space) => <li key={space.id}><span className={styles.activityDot} /><div><strong>{space.name}</strong><p>{space.slug}{space.mapReference ? ` · ${space.mapReference}` : ""}</p></div></li>)}</ol> : <Empty text="Nenhum espaço cadastrado." />}</section></div>;
}

function ActivityList() {
  const [activities, setActivities] = useState<Activity[] | null>(null); const [spaces, setSpaces] = useState<Space[]>([]); const [error, setError] = useState(""); const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [description, setDescription] = useState(""); const [kind, setKind] = useState("challenge"); const [spaceId, setSpaceId] = useState(""); const [checkInPoints, setCheckInPoints] = useState("10"); const [momentPoints, setMomentPoints] = useState("20"); const [cooldownSeconds, setCooldownSeconds] = useState("60"); const [allowsMoment, setAllowsMoment] = useState(true); const [startsAt, setStartsAt] = useState(nowInDeviceDateTimeInput); const [duration, setDuration] = useState("5");
  const load = useCallback(() => void api<{ data: Activity[] }>("/admin/activities").then((data) => setActivities(data.data)).catch(() => setError("Não foi possível carregar as atividades.")), []);
  useEffect(load, [load]);
  useEffect(() => { void api<{ data: Space[] }>("/admin/spaces").then((data) => setSpaces(data.data)).catch(() => setError("Não foi possível carregar os espaços.")); }, []);
  async function create(event: FormEvent) { event.preventDefault(); const start = deviceDateTimeToUtc(startsAt); if (!start) { setError("Informe um início válido."); return; } try { await api("/admin/activities", { method: "POST", body: { name, slug: slugify(slug), description: description || null, kind, spaceId: spaceId || null, checkInPoints: Number(checkInPoints), momentPoints: Number(momentPoints), cooldownSeconds: Number(cooldownSeconds), allowsMoment, startsAt: start, endsAt: new Date(new Date(start).getTime() + Number(duration) * 60_000).toISOString() } }); setName(""); setSlug(""); setDescription(""); setSpaceId(""); setStartsAt(nowInDeviceDateTimeInput()); load(); } catch { setError("Não foi possível criar a atividade."); } }
  if (error && !activities) return <Failure message={error} />;
  return <div className={styles.dashboard}><form className={styles.formCard} onSubmit={create}><SectionTitle kicker="Programação" title="Nova atividade" /><div className={styles.formGrid}><label>Nome<input value={name} onChange={(event) => { setName(event.target.value); setSlug(slugify(event.target.value)); }} required /></label><label>Slug<input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label><label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={3} /></label><label>Espaço<select value={spaceId} onChange={(event) => setSpaceId(event.target.value)}><option value="">Sem espaço</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></label><label>Tipo<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="schedule">Agenda</option><option value="checkpoint">Check-in</option><option value="challenge">Desafio</option><option value="competitive">Competitiva</option><option value="live">Ao vivo</option></select></label><label>Início<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></label><label>Duração<select value={duration} onChange={(event) => setDuration(event.target.value)}><option value="1">1 min</option><option value="5">5 min</option><option value="10">10 min</option><option value="15">15 min</option></select></label><label>Pontos no check-in<input type="number" min="0" value={checkInPoints} onChange={(event) => setCheckInPoints(event.target.value)} required /></label><label>Pontos por momento<input type="number" min="0" value={momentPoints} onChange={(event) => setMomentPoints(event.target.value)} required /></label><label>Intervalo entre check-ins (segundos)<input type="number" min="0" value={cooldownSeconds} onChange={(event) => setCooldownSeconds(event.target.value)} required /></label><label className={styles.help}><input type="checkbox" checked={allowsMoment} onChange={(event) => setAllowsMoment(event.target.checked)} /> Permitir envio de momento</label></div><div className={styles.formFooter}><button className={styles.primaryButton}>Criar atividade</button>{error && <p role="alert">{error}</p>}</div></form><section className={styles.activity}><SectionTitle kicker="Catálogo" title="Atividades cadastradas" />{!activities ? <Loading /> : activities.length ? <ol>{activities.map((activity) => <li key={activity.id}><span className={styles.activityDot} /><div><strong>{activity.name}</strong><p>{activity.kind} · {activity.status} · {activity.checkInPoints} ponto(s) no check-in</p></div></li>)}</ol> : <Empty text="Nenhuma atividade cadastrada." />}</section></div>;
}

function ModerationList() {
  const [moments, setMoments] = useState<Moderation[] | null>(null); const [error, setError] = useState(""); const [queue, setQueue] = useState<"challenge" | "general">("challenge");
  const load = useCallback(() => void api<{ data: Moderation[] }>(`/admin/moments/moderation?queue=${queue}&page=1`).then((data) => setMoments(data.data)).catch(() => setError("Não foi possível carregar a fila de moderação.")), [queue]);
  useEffect(load, [load]);
  async function decide(momentId: string, action: Moderation["availableActions"][number]) { try { await api(`/admin/moments/${momentId}/moderation`, { method: "POST", body: { action } }); load(); } catch { setError("Não foi possível aplicar a moderação."); } }
  if (error && !moments) return <Failure message={error} />;
  return <section className={styles.activity}><SectionTitle kicker="Correções" title="Moderação de Momentos" /><label className={styles.help}>Fila<select aria-label="Fila" value={queue} onChange={(event) => setQueue(event.target.value as typeof queue)}><option value="challenge">Desafios</option><option value="general">Geral</option></select></label>{error && <p role="alert">{error}</p>}{!moments ? <Loading /> : moments.length ? <ol>{moments.map((moment) => <li className={styles.moderationItem} key={moment.momentId}><span className={styles.activityDot} /><div><strong>{moment.participantName}</strong><p>{moment.activity?.name ?? "DNJ"} · {moment.pointsAwarded} pontos · {formatDate(moment.capturedAt)}</p></div><span className={styles.rowActions}>{moment.availableActions.map((action) => <button key={action} className={action === "delete_photo" ? styles.dangerButton : styles.ghostButton} onClick={() => decide(moment.momentId, action)}>{action === "delete_photo" ? "Excluir foto" : "Retirar pontos"}</button>)}</span></li>)}</ol> : <Empty text="Fila limpa. Não há Momentos para corrigir." />}</section>;
}

function Notifications() {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [message, setMessage] = useState(""); const [sending, setSending] = useState(false);
  async function send(event: FormEvent) { event.preventDefault(); setSending(true); setMessage(""); try { const result = await api<{ recipientCount: string }>("/admin/notifications", { method: "POST", body: { title, body } }); setTitle(""); setBody(""); setMessage(`Comunicado enviado para ${result.recipientCount} destinatário(s).`); } catch { setMessage("Não foi possível enviar o comunicado."); } finally { setSending(false); } }
  return <section className={styles.activity}><SectionTitle kicker="Comunicação" title="Enviar notificação" /><form className={styles.notificationForm} onSubmit={send}><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required /></label><label>Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={280} rows={4} required /></label><button className={styles.primaryButton} disabled={sending}>{sending ? "Enviando…" : "Enviar"}</button>{message && <p role="status">{message}</p>}</form></section>;
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) { return <div className={styles.sectionTitle}><div><p>{kicker}</p><h2>{title}</h2></div></div>; }
function Loading() { return <section className={styles.placeholder}><Clock3 size={27} /><p>Carregando dados operacionais…</p></section>; }
function Empty({ text }: { text: string }) { return <p className={styles.empty}>{text}</p>; }
function Failure({ message }: { message: string }) { return <section className={styles.placeholder}><CircleAlert size={28} /><h2>Dados indisponíveis</h2><p>{message}</p></section>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Sem data" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }
