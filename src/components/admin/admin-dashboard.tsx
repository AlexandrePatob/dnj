"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRoundCog,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import { toDataURL } from "qrcode";
import { apiMutation, apiRequest } from "@/lib/api/client";
import { PastoralQueueOverview } from "./pastoral-queue-overview";
import { deviceDateTimeToUtc, nowInDeviceDateTimeInput } from "@/lib/date-time";
import type { AdminPanel, AdminSession } from "@/types/admin";
import styles from "./admin-dashboard.module.css";

type Space = {
  id: string;
  name: string;
  slug: string;
  mapReference: string | null;
};
type ActivityKind =
  "schedule" | "checkpoint" | "competitive" | "live" | "challenge";
type Activity = {
  id: string;
  name: string;
  slug: string;
  kind: ActivityKind;
  status: string;
  description: string | null;
  spaceId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  checkInPoints: number;
  momentPoints: number;
  cooldownSeconds: number;
  allowsMoment: boolean;
  runsCount?: number;
  qrImageUrl?: string | null;
};
type Staff = {
  id: string;
  name: string;
  email: string;
  role: "DEFAULT" | "EVENT_MANAGER" | "ADMIN";
  scope?: string;
  onboardingComplete: boolean;
};
type Moderation = {
  momentId: string;
  imageUrl: string;
  capturedAt: string;
  participantName: string;
  activity: { id: string; name: string } | null;
  pointsAwarded: number;
  photoStatus: string;
  availableActions: Array<"approve" | "deny_points" | "delete_photo">;
};
type SpecialEvent = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  status?: "draft" | "teaser" | "active";
  expiresAt?: string;
  qrAvailableAt?: string;
};

type DashboardPanel =
  AdminPanel | "Filas pastorais" | (typeof activityTypes)[number]["label"];
const navigation: Array<{
  label: DashboardPanel;
  icon: typeof LayoutDashboard;
}> = [
  { label: "Gestores", icon: UserRoundCog },
  { label: "Atividades", icon: CalendarClock },
  { label: "Espaços", icon: UsersRound },
  { label: "Moderação", icon: ShieldCheck },
  { label: "Notificações", icon: Bell },
  { label: "Filas pastorais", icon: Clock3 },
];
const managerScopes = [
  { value: "actions", label: "Radicalidade" },
  { value: "space", label: "Programação" },
  { value: "pastoral_queue", label: "Fila" },
  { value: "special_events", label: "Eventos especiais" },
] as const;
const activityTypes = [
  {
    kind: "schedule",
    label: "Programação",
    description: "Organize a programação do encontro.",
    icon: CalendarClock,
  },
  {
    kind: "checkpoint",
    label: "Estáticos",
    description: "Crie pontos de presença com QR Code.",
    icon: QrCode,
  },
  {
    kind: "competitive",
    label: "Games",
    description: "Acompanhe jogos conduzidos pela Radicalidade.",
    icon: Gamepad2,
  },
  {
    kind: "live",
    label: "Eventos especiais",
    description: "Publique ações e chamadas ao vivo.",
    icon: Zap,
  },
  {
    kind: "challenge",
    label: "Desafio do momento",
    description: "Defina pontos, duração e janela de fotos.",
    icon: Sparkles,
  },
] as const;

type DashboardRequest = Omit<RequestInit, "body"> & { body?: unknown };
async function api<T>(path: string, init: DashboardRequest = {}): Promise<T> {
  const { body, method, ...options } = init;
  return method && method !== "GET"
    ? apiMutation<T>(path, { ...options, method, body })
    : apiRequest<T>(path, { ...options, method, body });
}

export function AdminDashboard({
  session,
  onExit,
}: {
  session: AdminSession;
  onExit: () => void;
}) {
  const [panel, setPanel] = useState<DashboardPanel>("Gestores");
  const [activitiesOpen, setActivitiesOpen] = useState(true);
  const [activityKind, setActivityKind] = useState<ActivityKind>("schedule");
  async function signOut() {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "include",
    });
    onExit();
  }
  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span>DNJ</span>
          <strong>Central de operação</strong>
          <small>Admin global</small>
        </div>
        <nav
          aria-label="Navegação administrativa"
          className={styles.navigation}
        >
          {navigation.map(({ label, icon: Icon }) =>
            label === "Atividades" ? (
              <div key={label} className={styles.navGroup}>
                <button
                  className={
                    panel === label ? styles.activeNav : styles.navItem
                  }
                  onClick={() => {
                    setActivitiesOpen((value) => !value);
                    setActivityKind("challenge");
                    setPanel(label);
                  }}
                >
                  <Icon size={17} />
                  Atividades
                  <ChevronDown
                    className={activitiesOpen ? styles.chevronOpen : ""}
                    size={15}
                  />
                </button>
                {activitiesOpen && (
                  <div className={styles.subNavigation}>
                    {activityTypes.map(
                      ({ kind, label: subLabel, icon: SubIcon }) => (
                        <button
                          key={kind}
                          aria-label={
                            kind === "live"
                              ? "Abrir Eventos especiais"
                              : undefined
                          }
                          className={
                            panel === subLabel
                              ? styles.activeSubNav
                              : styles.subNavItem
                          }
                          onClick={() => {
                            setActivityKind(kind);
                            setPanel(subLabel);
                          }}
                        >
                          <SubIcon size={14} />
                          {subLabel}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={label}
                className={panel === label ? styles.activeNav : styles.navItem}
                onClick={() => setPanel(label)}
              >
                <Icon size={17} />
                {label}
              </button>
            ),
          )}
        </nav>
        <button className={styles.exit} onClick={signOut}>
          <LogOut size={17} />
          Sair
        </button>
      </aside>
      <section className={styles.content}>
        <header className={styles.header}>
          <div>
            <p className={styles.context}>DNJ 2026 · Administração</p>
            <h1>{panel}</h1>
          </div>
          <div className={styles.admin}>
            <span className={styles.avatar}>
              {session.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{session.name}</strong>
              <small>{session.email}</small>
            </span>
          </div>
        </header>
        {panel === "Gestores" && <StaffList />}
        {(panel === "Atividades" ||
          activityTypes.some((item) => item.label === panel)) && (
          <ActivityList
            kind={
              panel === "Atividades"
                ? activityKind
                : (activityTypes.find((item) => item.label === panel)?.kind ??
                  activityKind)
            }
          />
        )}
        {panel === "Espaços" && <SpaceList />}
        {panel === "Moderação" && <ModerationList />}
        {panel === "Notificações" && <Notifications />}
        {panel === "Filas pastorais" && <PastoralQueueOverview />}
      </section>
    </main>
  );
}

function StaffList() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [scopeByUser, setScopeByUser] = useState<Record<string, string>>({});
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateScope, setCandidateScope] = useState("actions");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const managers = await api<{ data: Staff[] }>(
        "/admin/staff?role=EVENT_MANAGER",
      );
      const managerItems = managers.data.filter(
        (item) => item.role === "EVENT_MANAGER",
      );
      setStaff(managerItems);
      setScopeByUser(
        Object.fromEntries(
          managerItems.map((item) => [item.id, item.scope ?? "actions"]),
        ),
      );
    } catch {
      setError("Não foi possível carregar os gestores.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function changeRole(user: Staff, role: "DEFAULT" | "EVENT_MANAGER") {
    try {
      await api(`/admin/users/${encodeURIComponent(user.id)}/role`, {
        method: "PATCH",
        body: {
          role,
          ...(role === "EVENT_MANAGER"
            ? { scope: scopeByUser[user.id] ?? "actions" }
            : {}),
        },
      });
      setMessage(
        role === "EVENT_MANAGER"
          ? `${user.name} agora é gestor.`
          : `${user.name} foi rebaixado para participante.`,
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível alterar o papel.",
      );
    }
  }
  async function promoteByEmail() {
    const email = candidateEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await api(`/admin/users/${encodeURIComponent(email)}/role`, {
        method: "PATCH",
        body: { role: "EVENT_MANAGER", scope: candidateScope },
      });
      setMessage(`${email} agora é gestor.`);
      setCandidateEmail("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível encontrar ou promover esse e-mail.",
      );
    }
  }
  if (error && !staff) return <Failure message={error} />;
  if (!staff) return <Loading />;
  return (
    <div className={styles.dashboard}>
      <section className={styles.activity}>
        <SectionTitle
          kicker="Contas operacionais"
          title={`${staff.length} gestor(es)`}
        />
        {message && (
          <p role="status" className={styles.operationMessage}>
            {message}
          </p>
        )}
        {staff.length ? (
          <ol>
            {staff.map((manager) => (
              <li key={manager.id}>
                <span className={styles.activityDot} />
                <div>
                  <strong>{manager.name}</strong>
                  <p>{manager.email}</p>
                  <p>
                    {manager.role} ·{" "}
                    {manager.onboardingComplete
                      ? "cadastro concluído"
                      : "cadastro pendente"}
                  </p>
                </div>
                <span className={styles.rowActions}>
                  <label>
                    Área
                    <select
                      aria-label={`Área de ${manager.name}`}
                      value={
                        scopeByUser[manager.id] ?? manager.scope ?? "actions"
                      }
                      onChange={(event) =>
                        setScopeByUser((current) => ({
                          ...current,
                          [manager.id]: event.target.value,
                        }))
                      }
                    >
                      {managerScopes.map((scope) => (
                        <option key={scope.value} value={scope.value}>
                          {scope.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.ghostButton}
                    onClick={() => void changeRole(manager, "EVENT_MANAGER")}
                  >
                    Salvar área
                  </button>
                  <button
                    className={styles.dangerButton}
                    onClick={() => void changeRole(manager, "DEFAULT")}
                  >
                    Rebaixar
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty text="Nenhum gestor cadastrado." />
        )}
      </section>
      <section className={styles.activity}>
        <SectionTitle kicker="Participantes" title="Adicionar gestor" />
        <p className={styles.help}>
          Digite o e-mail de uma conta existente. Se não existir, nada será
          alterado.
        </p>
        {error && (
          <p role="alert" className={styles.operationError}>
            {error}
          </p>
        )}
        <details>
          <summary className={styles.primaryButton}>
            Vincular participante por e-mail
          </summary>
          <form
            className={styles.rowActions}
            onSubmit={(event) => {
              event.preventDefault();
              void promoteByEmail();
            }}
          >
            <label>
              E-mail do participante
              <input
                aria-label="E-mail do participante"
                type="email"
                value={candidateEmail}
                onChange={(event) => setCandidateEmail(event.target.value)}
                placeholder="participante@exemplo.com"
                required
              />
            </label>
            <label>
              Área
              <select
                aria-label="Área do novo gestor"
                value={candidateScope}
                onChange={(event) => setCandidateScope(event.target.value)}
              >
                {managerScopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={!candidateEmail.trim()}
            >
              Tornar gestor
            </button>
          </form>
        </details>
      </section>
    </div>
  );
}

function SpaceList() {
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const load = useCallback(
    () =>
      void api<{ data: Space[] }>("/admin/spaces")
        .then((data) => setSpaces(data.data))
        .catch(() => setError("Não foi possível carregar os espaços.")),
    [],
  );
  useEffect(load, [load]);
  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/admin/spaces", {
        method: "POST",
        body: { name, slug: slugify(slug) },
      });
      setName("");
      setSlug("");
      load();
    } catch {
      setError("Não foi possível criar o espaço.");
    }
  }
  if (error && !spaces) return <Failure message={error} />;
  return (
    <div className={styles.dashboard}>
      <form className={styles.formCard} onSubmit={create}>
        <SectionTitle kicker="Estrutura" title="Novo espaço" />
        <div className={styles.formGrid}>
          <label>
            Nome
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(slugify(event.target.value));
              }}
              required
            />
          </label>
          <label>
            Slug
            <input
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </label>
        </div>
        <div className={styles.formFooter}>
          <button className={styles.primaryButton}>Criar espaço</button>
          {error && <p role="alert">{error}</p>}
        </div>
      </form>
      <section className={styles.activity}>
        <SectionTitle kicker="Espaços" title="Locais cadastrados" />
        {!spaces ? (
          <Loading />
        ) : spaces.length ? (
          <ol>
            {spaces.map((space) => (
              <li key={space.id}>
                <span className={styles.activityDot} />
                <div>
                  <strong>{space.name}</strong>
                  <p>
                    {space.slug}
                    {space.mapReference ? ` · ${space.mapReference}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty text="Nenhum espaço cadastrado." />
        )}
      </section>
    </div>
  );
}

function ActivityList({ kind }: { kind: ActivityKind }) {
  const config =
    activityTypes.find((item) => item.kind === kind) ?? activityTypes[0];
  const TypeIcon = config.icon;
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Activity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [checkInPoints, setCheckInPoints] = useState("10");
  const [momentPoints, setMomentPoints] = useState("20");
  const [cooldownSeconds, setCooldownSeconds] = useState("60");
  const [allowsMoment, setAllowsMoment] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [qrByActivity, setQrByActivity] = useState<Record<string, string>>({});
  const [runByActivity, setRunByActivity] = useState<Record<string, string>>({});
  const [creatingQr, setCreatingQr] = useState("");
  const load = useCallback(async () => {
    try {
      const data = await api<{ data: Activity[] }>("/admin/activities");
      setActivities(data.data);
    } catch {
      setError("Não foi possível carregar as atividades.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void api<{ data: Space[] }>("/admin/spaces")
      .then((data) => setSpaces(data.data))
      .catch(() => setError("Não foi possível carregar os espaços."));
  }, []);
  function reset() {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setSpaceId("");
    setCheckInPoints(kind === "challenge" ? "0" : "10");
    setMomentPoints("20");
    setCooldownSeconds(kind === "challenge" ? "0" : "60");
    setAllowsMoment(true);
    setStartsAt("");
    setEndsAt("");
    setDurationMinutes("");
  }
  function closeForm() {
    reset();
    setFormOpen(false);
  }
  function openNew() {
    setError("");
    setMessage("");
    reset();
    setFormOpen(true);
  }
  function edit(activity: Activity) {
    setError("");
    setMessage("");
    setEditing(activity);
    setName(activity.name);
    setSlug(activity.slug);
    setDescription(activity.description ?? "");
    setSpaceId(activity.spaceId ?? "");
    setCheckInPoints(String(activity.checkInPoints));
    setMomentPoints(String(activity.momentPoints));
    setCooldownSeconds(String(activity.cooldownSeconds));
    setAllowsMoment(true);
    setStartsAt(toDeviceDateTimeInput(activity.startsAt));
    setEndsAt(toDeviceDateTimeInput(activity.endsAt));
    setDurationMinutes("");
    setFormOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const start = startsAt ? deviceDateTimeToUtc(startsAt) : null;
    const explicitEnd = endsAt ? deviceDateTimeToUtc(endsAt) : null;
    const end =
      kind === "challenge" && start && durationMinutes
        ? new Date(
            new Date(start).getTime() + Number(durationMinutes) * 60_000,
          ).toISOString()
        : explicitEnd;
    if (
      kind === "challenge" && !endsAt && !durationMinutes
    ) {
      setError("Informe o fim ou a duração do desafio.");
      return;
    }
    if (
      (startsAt && !start) ||
      (endsAt && !explicitEnd) ||
      (start && end && new Date(end) <= new Date(start))
    ) {
      setError("O fim deve ser posterior ao início.");
      return;
    }
    try {
      const action = editing ? "alterações salvas" : "atividade criada";
      await api(
        editing ? `/admin/activities/${editing.id}` : "/admin/activities",
        {
          method: editing ? "PATCH" : "POST",
          body: {
            name,
            slug: slugify(slug),
            description: description || null,
            kind,
            spaceId: kind === "challenge" ? null : spaceId || null,
            checkInPoints: kind === "challenge" ? 0 : Number(checkInPoints),
            momentPoints: kind === "challenge" ? Number(momentPoints) : 0,
            cooldownSeconds: kind === "challenge" ? 0 : Number(cooldownSeconds),
            allowsMoment: kind === "challenge" || allowsMoment,
            startsAt: start,
            endsAt: end,
          },
        },
      );
      await load();
      closeForm();
      setMessage(`Atividade: ${action}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a atividade.",
      );
    }
  }
  async function updateStatus(activity: Activity, status: "active" | "paused") {
    try {
      setError("");
      setMessage("");
      await api(`/admin/activities/${activity.id}`, {
        method: "PATCH",
        body: { status },
      });
      setActivities(
        (current) =>
          current?.map((item) =>
            item.id === activity.id ? { ...item, status } : item,
          ) ?? null,
      );
      setMessage(`Atividade ${status === "active" ? "ativada" : "pausada"}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o status da atividade.",
      );
    }
  }
  async function remove(activity: Activity) {
    if (
      !window.confirm(
        `Arquivar a atividade “${activity.name}”? Ela deixará de aparecer neste catálogo.`,
      )
    )
      return;
    try {
      setError("");
      setMessage("");
      await api(`/admin/activities/${activity.id}`, {
        method: "PATCH",
        body: { status: "archived" },
      });
      setActivities(
        (current) => current?.filter((item) => item.id !== activity.id) ?? null,
      );
      if (editing?.id === activity.id) closeForm();
      setMessage("Atividade arquivada.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível arquivar a atividade.",
      );
    }
  }
  async function generateQr(activity: Activity) {
    setCreatingQr(activity.id);
    try {
      const runId =
        runByActivity[activity.id] ??
        (
          await api<{ id: string }>("/manager/runs", {
            method: "POST",
            body: { gameId: activity.id },
          })
        ).id;
      setRunByActivity((current) => ({ ...current, [activity.id]: runId }));
      const run = await api<{
        qrToken?: string;
        qrImageUrl?: string;
      }>(`/manager/runs/${runId}/qr`, { method: "POST" });
      const qr =
        run.qrImageUrl ??
        (run.qrToken
          ? await toDataURL(run.qrToken, { width: 420, margin: 2 })
          : undefined);
      if (!qr) throw new Error("A API não retornou o QR Code.");
      setQrByActivity((current) => ({ ...current, [activity.id]: qr }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível gerar o QR Code.",
      );
    } finally {
      setCreatingQr("");
    }
  }
  function downloadQr(activity: Activity) {
    const url = qrByActivity[activity.id];
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(activity.name)}-qr.png`;
    link.click();
  }
  if (kind === "live") return <SpecialEventsPanel />;
  if (error && !activities) return <Failure message={error} />;
  const visible =
    activities?.filter(
      (activity) => activity.kind === kind && activity.status !== "archived",
    ) ?? [];
  return (
    <div className={styles.dashboard}>
      <section className={styles.activity}>
        <div className={styles.workspaceIntro}>
          <div>
            <p className={styles.context}>Atividades · {config.label}</p>
            <h2>{config.label}</h2>
            <p className={styles.help}>{config.description}</p>
          </div>
          <button className={styles.primaryButton} onClick={openNew}>
            <Plus size={15} />{" "}
            {kind === "challenge" ? "Nova atividade" : "Nova"}
          </button>
        </div>
        {error && (
          <p role="alert" className={styles.operationError}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={styles.operationMessage}>
            {message}
          </p>
        )}
        {!activities ? (
          <Loading />
        ) : visible.length ? (
          <div className={styles.activityCards}>
            {visible.map((activity) => (
              <article className={styles.activityCard} key={activity.id}>
                <div className={styles.activityCardTop}>
                  <span className={styles.typeBadge}>
                    <TypeIcon size={13} /> {config.label}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${activity.status === "active" ? styles.statusActive : ""}`}
                  >
                    {activity.status === "active"
                      ? "Ativa"
                      : activity.status === "paused"
                        ? "Pausada"
                        : "Rascunho"}
                  </span>
                </div>
                <h3>{activity.name}</h3>
                <p>
                  {activity.description ||
                    (kind === "schedule"
                      ? "Sem descrição. Adicione uma orientação para o gestor."
                      : "Sem descrição cadastrada.")}
                </p>
                <div className={styles.activityMeta}>
                  <span>
                    {activity.startsAt
                      ? formatDate(activity.startsAt)
                      : "Sem horário"}
                  </span>
                  <span>{activity.checkInPoints} pts no check-in</span>
                  {kind === "competitive" && (
                    <span>
                      <BarChart3 size={13} /> {activity.runsCount ?? "—"} runs
                    </span>
                  )}
                  {kind === "challenge" && (
                    <span>
                      <Timer size={13} />{" "}
                      {activity.endsAt
                        ? `até ${formatDate(activity.endsAt)}`
                        : "duração aberta"}
                    </span>
                  )}
                </div>
                {(kind === "checkpoint" || kind === "challenge") && (
                  <div className={styles.qrPanel}>
                    {qrByActivity[activity.id] ? (
                      <img
                        src={qrByActivity[activity.id]}
                        alt={`QR Code de ${activity.name}`}
                      />
                    ) : (
                      <QrCode size={52} />
                    )}
                    <div>
                      <strong>
                        {qrByActivity[activity.id]
                          ? "QR Code pronto"
                          : "QR ainda não gerado"}
                      </strong>
                      <small>Baixe a imagem para imprimir no local.</small>
                      <div className={styles.rowActions}>
                        {qrByActivity[activity.id] ? (
                          <button
                            className={styles.ghostButton}
                            onClick={() => downloadQr(activity)}
                          >
                            <Download size={14} /> Baixar PNG
                          </button>
                        ) : (
                          <button
                            className={styles.primaryButton}
                            disabled={creatingQr === activity.id}
                            onClick={() => void generateQr(activity)}
                          >
                            {creatingQr === activity.id
                              ? "Gerando…"
                              : "Gerar QR Code"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {kind === "competitive" && (
                  <div className={styles.readOnlyNote}>
                    <Eye size={15} /> Somente visualização · controle feito pelo
                    gestor de Radicalidade
                  </div>
                )}
                <div className={styles.rowActions}>
                  <button
                    className={styles.ghostButton}
                    onClick={() => edit(activity)}
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  {kind !== "competitive" && activity.status === "draft" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => void updateStatus(activity, "active")}
                    >
                      Ativar
                    </button>
                  )}
                  {activity.status === "active" && kind !== "competitive" && (
                    <button
                      className={styles.ghostButton}
                      onClick={() => void updateStatus(activity, "paused")}
                    >
                      Pausar
                    </button>
                  )}
                  <button
                    className={styles.dangerButton}
                    onClick={() => void remove(activity)}
                  >
                    Excluir
                  </button>
                </div>
                {kind !== "competitive" && (
                  <ManagerAssignments activityId={activity.id} />
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            text={`Nenhuma atividade em ${config.label.toLowerCase()}. Crie a primeira para começar.`}
          />
        )}
      </section>
      {formOpen && (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <form
            className={`${styles.formCard} ${styles.activityDialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-dialog-title"
            onSubmit={save}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeForm();
            }}
          >
            <SectionTitle
              kicker={config.label}
              title={
                editing ? `Editar: ${editing.name}` : `Nova em ${config.label}`
              }
            />
            <h2 id="activity-dialog-title" className={styles.srOnly}>
              {editing ? `Editar ${editing.name}` : "Nova atividade"}
            </h2>
            <p className={styles.help}>
              Preencha os dados que o gestor e os participantes precisam ver.
            </p>
            <div className={styles.formGrid}>
              <label>
                Nome
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!editing) setSlug(slugify(event.target.value));
                  }}
                  required
                />
              </label>
              <label>
                Slug
                <input
                  value={slug}
                  onChange={(event) => setSlug(slugify(event.target.value))}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  required
                />
              </label>
              <label className={styles.fullField}>
                Descrição
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={4000}
                  rows={3}
                />
              </label>
              {kind !== "challenge" && <label>
                Espaço
                <select
                  value={spaceId}
                  onChange={(event) => setSpaceId(event.target.value)}
                >
                  <option value="">Sem espaço</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </label>}
              <label>
                Início
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required={kind === "challenge" && !editing}
                />
              </label>
              <label>
                {kind === "challenge" ? "Fim (opcional)" : "Fim / duração"}
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
              {kind !== "challenge" && <label>
                Pontos no check-in
                <input
                  type="number"
                  min="0"
                  value={checkInPoints}
                  onChange={(event) => setCheckInPoints(event.target.value)}
                  required
                />
              </label>}
              {kind === "challenge" && (
                <label>
                  Pontos por momento
                  <input
                    type="number"
                    min="0"
                    value={momentPoints}
                    onChange={(event) => setMomentPoints(event.target.value)}
                    required
                  />
                </label>
              )}
              {kind !== "challenge" && <label>
                Intervalo entre check-ins (segundos)
                <input
                  type="number"
                  min="0"
                  value={cooldownSeconds}
                  onChange={(event) => setCooldownSeconds(event.target.value)}
                  required
                />
              </label>}
              {kind === "challenge" && <label>Duração (minutos)<input type="number" min="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>}
            </div>
            <div className={styles.formFooter}>
              <button className={styles.primaryButton}>
                {editing ? "Salvar alterações" : "Criar atividade"}
              </button>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={closeForm}
              >
                Cancelar
              </button>
              {error && <p role="alert">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SpecialEventsPanel() {
  const [events, setEvents] = useState<SpecialEvent[] | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [duration, setDuration] = useState("5");
  const [customDuration, setCustomDuration] = useState("");
  const [targets, setTargets] = useState<string[]>(["app"]);
  const [activeQr, setActiveQr] = useState<{
    title: string;
    imageUrl: string;
    expiresAt?: string;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await api<{
        events?: SpecialEvent[];
        data?: SpecialEvent[];
      }>("/manager/special-events");
      setEvents(data.events ?? data.data ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os eventos especiais.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function toggleTarget(target: string) {
    setTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/manager/special-events", {
        method: "POST",
        body: {
          title,
          description,
          points: Number(points) || undefined,
          durationMinutes:
            duration === "custom" ? Number(customDuration) : Number(duration),
          targets,
        },
      });
      setTitle("");
      setDescription("");
      setPoints("");
      setDuration("5");
      setCustomDuration("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível criar o evento especial.",
      );
    }
  }
  async function operate(event: SpecialEvent) {
    const path =
      event.status === "draft"
        ? "/manager/special-events/teaser"
        : event.status === "teaser"
          ? "/manager/special-events/qr"
          : "/manager/special-events/close";
    try {
      const result = await api<{ qrToken?: string; expiresAt?: string }>(path, {
        method: "POST",
        body: { eventId: event.id },
      });
      if (result.qrToken)
        setActiveQr({
          title: event.title,
          imageUrl: await toDataURL(result.qrToken, { width: 360, margin: 1 }),
          expiresAt: result.expiresAt ?? event.expiresAt,
        });
      if (event.status === "active") setActiveQr(null);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar o evento.",
      );
    }
  }
  async function renewQr(event: SpecialEvent) {
    try {
      const result = await api<{ qrToken: string; expiresAt?: string }>(
        "/manager/special-events/qr",
        { method: "POST", body: { eventId: event.id } },
      );
      setActiveQr({
        title: event.title,
        imageUrl: await toDataURL(result.qrToken, { width: 360, margin: 1 }),
        expiresAt: result.expiresAt ?? event.expiresAt,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível gerar o QR Code.",
      );
    }
  }
  if (!events) return <Loading />;
  return (
    <div className={styles.dashboard}>
      <section className={styles.activity}>
        <div className={styles.workspaceIntro}>
          <div>
            <p className={styles.context}>Atividades · Eventos especiais</p>
            <h2>Eventos especiais</h2>
            <p className={styles.help}>
              A mesma operação do gestor: crie, exiba em App/TV/Telão, solte o
              teaser e libere o QR.
            </p>
          </div>
          <Sparkles size={22} />
        </div>
        {error && (
          <p role="alert" className={styles.operationError}>
            {error}
          </p>
        )}
        <form
          className={styles.specialEventForm}
          onSubmit={(event) => void create(event)}
        >
          <label>
            Nome do evento
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            Descrição para o app
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={180}
            />
          </label>
          <label>
            Pontos
            <input
              type="number"
              min="0"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
            />
          </label>
          <label>
            Duração
            <select
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            >
              {[1, 3, 5, 10, 15].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
              <option value="custom">Personalizada</option>
            </select>
          </label>
          {duration === "custom" && (
            <label>
              Minutos personalizados
              <input
                type="number"
                min="1"
                max="180"
                value={customDuration}
                onChange={(event) => setCustomDuration(event.target.value)}
                required
              />
            </label>
          )}
          <fieldset className={styles.targetFields}>
            <legend>Exibir em</legend>
            {[
              ["app", "App"],
              ["tv", "TV"],
              ["screen", "Telão"],
            ].map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={targets.includes(id)}
                  onChange={() => toggleTarget(id)}
                />{" "}
                {label}
              </label>
            ))}
          </fieldset>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={!targets.length}
          >
            <Sparkles size={15} /> Criar evento
          </button>
        </form>
        {activeQr && (
          <div className={styles.qrCard}>
            <div>
              <p>QR liberado</p>
              <h2>{activeQr.title}</h2>
              <small>
                {activeQr.expiresAt
                  ? `QR ativo até ${formatDate(activeQr.expiresAt)}.`
                  : "QR ativo."}
              </small>
            </div>
            <img
              src={activeQr.imageUrl}
              alt={`QR Code do evento ${activeQr.title}`}
            />
          </div>
        )}
        <div className={styles.specialEventList}>
          {events.length ? (
            events.map((event) => (
              <article className={styles.specialEventCard} key={event.id}>
                <div>
                  <span className={styles.typeBadge}>
                    <Sparkles size={13} /> Evento especial
                  </span>
                  <h3>{event.title}</h3>
                  <p>{event.description || "Sem descrição para o app."}</p>
                  <small>
                    {event.points ?? 0} pontos ·{" "}
                    {event.status === "teaser"
                      ? "Teaser em andamento"
                      : event.status === "active"
                        ? "QR ativo"
                        : "Pronto para o teaser"}
                  </small>
                </div>
                <div className={styles.rowActions}>
                  {event.status === "active" && (
                    <button
                      className={styles.ghostButton}
                      onClick={() => void renewQr(event)}
                    >
                      Gerar novo QR
                    </button>
                  )}
                  <button
                    className={
                      event.status === "active"
                        ? styles.dangerButton
                        : styles.primaryButton
                    }
                    onClick={() => void operate(event)}
                  >
                    {event.status === "draft"
                      ? "Teaser 15 s"
                      : event.status === "teaser"
                        ? "Liberar QR"
                        : "Encerrar"}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty text="Crie um evento para iniciar o teaser e gerar um QR novo." />
          )}
        </div>
      </section>
    </div>
  );
}

function ManagerAssignments({ activityId }: { activityId: string }) {
  const [managers, setManagers] = useState<Staff[]>([]);
  const [assigned, setAssigned] = useState<Staff[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [available, current] = await Promise.all([
        api<{ data: Staff[] }>("/admin/staff?role=EVENT_MANAGER"),
        api<{ data: Staff[] }>(`/admin/activities/${activityId}/managers`),
      ]);
      setManagers(available.data);
      setAssigned(current.data);
    } catch {
      setError("Não foi possível carregar os vínculos.");
    }
  }, [activityId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function assign() {
    if (!selected) return;
    try {
      await api(`/admin/activities/${activityId}/managers/${selected}`, {
        method: "PUT",
      });
      setSelected("");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível vincular o gestor.",
      );
    }
  }
  async function remove(userId: string) {
    try {
      await api(`/admin/activities/${activityId}/managers/${userId}`, {
        method: "DELETE",
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível remover o vínculo.",
      );
    }
  }
  return (
    <div className={styles.help}>
      <strong>Gestores:</strong>{" "}
      {assigned.length
        ? assigned.map((manager) => (
            <span key={manager.id}>
              {" "}
              {manager.email || manager.name}{" "}
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => void remove(String(manager.id))}
              >
                remover
              </button>
            </span>
          ))
        : " nenhum"}{" "}
      {managers.length > assigned.length && (
        <span>
          <select
            aria-label={`E-mail do gestor da atividade ${activityId}`}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Vincular e-mail…</option>
            {managers
              .filter(
                (manager) => !assigned.some((item) => item.id === manager.id),
              )
              .map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.email || manager.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!selected}
            onClick={() => void assign()}
          >
            Vincular
          </button>
        </span>
      )}{" "}
      {error && <span role="alert"> {error}</span>}
    </div>
  );
}

function ModerationList() {
  const [moments, setMoments] = useState<Moderation[] | null>(null);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<"challenge" | "general">("challenge");
  const [selectedMoment, setSelectedMoment] = useState<Moderation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(
    () =>
      void api<{ data: Moderation[] }>(
        `/admin/moments/moderation?queue=${queue}&page=1`,
      )
        .then((data) => setMoments(data.data))
        .catch(() =>
          setError("Não foi possível carregar a fila de moderação."),
        ),
    [queue],
  );
  useEffect(load, [load]);
  async function decide(
    momentId: string,
    action: Moderation["availableActions"][number],
  ) {
    try {
      setSubmitting(true);
      await api(`/admin/moments/${momentId}/moderation`, {
        method: "POST",
        body: { action },
      });
      const index = moments?.findIndex((moment) => moment.momentId === momentId) ?? -1;
      setSelectedMoment(
        index >= 0 ? (moments?.[index + 1] ?? moments?.[index - 1] ?? null) : null,
      );
      setMoments((items) => items?.filter((moment) => moment.momentId !== momentId) ?? null);
      load();
    } catch {
      setError("Não foi possível aplicar a moderação.");
    } finally {
      setSubmitting(false);
    }
  }
  if (error && !moments) return <Failure message={error} />;
  return (
    <section className={styles.activity}>
      <SectionTitle kicker="Correções" title="Moderação de Momentos" />
      <label className={styles.help}>
        Fila
        <select
          aria-label="Fila"
          value={queue}
          onChange={(event) => {
            setSelectedMoment(null);
            setQueue(event.target.value as typeof queue);
          }}
        >
          <option value="challenge">Desafios</option>
          <option value="general">Geral</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {!moments ? (
        <Loading />
      ) : moments.length ? (
        <ol className={styles.moderationGrid}>
          {moments.map((moment) => (
            <li className={styles.moderationItem} key={moment.momentId}>
              {moment.photoStatus === "available" && moment.imageUrl ? (
                <button
                  type="button"
                  className={styles.moderationPhoto}
                  onClick={() => setSelectedMoment(moment)}
                  aria-label={`Ampliar foto enviada por ${moment.participantName}`}
                >
                  <img
                    src={moment.imageUrl}
                    alt={`Foto enviada por ${moment.participantName}`}
                  />
                </button>
              ) : (
                <span className={styles.moderationPhotoUnavailable}>
                  Foto indisponível
                </span>
              )}
              <div className={styles.moderationContent}>
                <div className={styles.moderationHeading}>
                  <strong>{moment.participantName}</strong>
                  {moment.activity && (
                    <span className={styles.moderationKind}>Desafio</span>
                  )}
                </div>
                <p>
                  {moment.activity?.name ?? "DNJ"} · {moment.pointsAwarded}{" "}
                  pontos · {formatDate(moment.capturedAt)}
                </p>
                <span className={styles.moderationActions}>
                  {moment.availableActions.map((action) => (
                    <button
                      key={action}
                      disabled={submitting}
                      className={
                        action === "approve"
                          ? styles.primaryButton
                          : action === "delete_photo"
                            ? styles.dangerButton
                            : styles.ghostButton
                      }
                      onClick={() => void decide(moment.momentId, action)}
                    >
                      {action === "approve"
                        ? "Aceitar"
                        : action === "delete_photo"
                          ? "Excluir foto"
                          : "Retirar pontos"}
                    </button>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty text="Fila limpa. Não há Momentos para corrigir." />
      )}
      {selectedMoment && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={`Moderar foto de ${selectedMoment.participantName}`}
          className={styles.moderationDialogBackdrop}
          onClick={() => setSelectedMoment(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSelectedMoment(null);
          }}
        >
          <div className={styles.moderationDialog} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.moderationDialogClose}
              onClick={() => setSelectedMoment(null)}
              aria-label="Fechar foto"
            >
              <X size={20} />
            </button>
            <img
              src={selectedMoment.imageUrl}
              alt={`Foto enviada por ${selectedMoment.participantName}`}
            />
            <div className={styles.moderationDialogFooter}>
              <div>
                <strong>{selectedMoment.participantName}</strong>
                <p>{selectedMoment.activity?.name ?? "DNJ"} · {selectedMoment.pointsAwarded} pontos</p>
              </div>
              <span className={styles.moderationActions}>
                {selectedMoment.availableActions.map((action) => (
                  <button
                    key={action}
                    disabled={submitting}
                    className={
                      action === "approve"
                        ? styles.primaryButton
                        : action === "delete_photo"
                          ? styles.dangerButton
                          : styles.ghostButton
                    }
                    onClick={() => void decide(selectedMoment.momentId, action)}
                  >
                    {action === "approve"
                      ? "Aceitar"
                      : action === "delete_photo"
                        ? "Excluir foto"
                        : "Retirar pontos"}
                  </button>
                ))}
              </span>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

function Notifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    try {
      const result = await api<{ recipientCount: string }>(
        "/admin/notifications",
        { method: "POST", body: { title, body } },
      );
      setTitle("");
      setBody("");
      setMessage(
        `Notificação enfileirada para ${result.recipientCount} destinatário(s). Confirme o recebimento em um dispositivo inscrito.`,
      );
    } catch {
      setMessage(
        "Não foi possível enfileirar a notificação. Confira a conexão e tente novamente.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <section className={styles.activity}>
      <SectionTitle kicker="Comunicação" title="Enviar notificação" />
      <p className={styles.help}>
        O envio alcança as inscrições push ativas. A confirmação abaixo comprova
        o enfileiramento na API; a entrega no aparelho deve ser validada no
        dispositivo de teste.
      </p>
      <form className={styles.notificationForm} onSubmit={send}>
        <label>
          Título
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label>
          Mensagem
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={280}
            rows={4}
            required
          />
        </label>
        <button className={styles.primaryButton} disabled={sending}>
          {sending ? "Enfileirando…" : "Enviar para inscritos"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className={styles.sectionTitle}>
      <div>
        <p>{kicker}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}
function Loading() {
  return (
    <section className={styles.placeholder}>
      <Clock3 size={27} />
      <p>Carregando dados operacionais…</p>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className={styles.empty}>{text}</p>;
}
function Failure({ message }: { message: string }) {
  return (
    <section className={styles.placeholder}>
      <CircleAlert size={28} />
      <h2>Dados indisponíveis</h2>
      <p>{message}</p>
    </section>
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sem data"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function toDeviceDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
