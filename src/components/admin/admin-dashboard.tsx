"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  UsersRound,
  UserRoundCog,
} from "lucide-react";
import type { AdminMoment, AdminPanel, AdminSession } from "@/types/admin";
import styles from "./admin-dashboard.module.css";

const navigation: Array<{ label: AdminPanel; icon: typeof LayoutDashboard }> = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Gestores", icon: UserRoundCog },
  { label: "Experiências", icon: CalendarClock },
  { label: "Desafios de Momento", icon: Sparkles },
  { label: "Eventos especiais", icon: Gamepad2 },
  { label: "Moderação geral", icon: ShieldCheck },
  { label: "Moderação de desafio", icon: Check },
  { label: "Participantes", icon: UsersRound },
  { label: "Auditoria", icon: Clock3 },
  { label: "Notificações", icon: Bell },
];

type OverviewData = {
  activeUsers: number;
  pendingModeration: number;
  pendingChallengeModeration: number;
  activeManagers: number;
  liveSpecialEvents: number;
  openExperiences: number;
  interactionsToday: number;
  activity: Array<{ event_type: string; created_at: string }>;
};
type ApiExperience = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  check_in_points: number;
  moment_points: number;
  moment_duration_minutes: number | null;
  status: string;
  spaces?: { name: string } | null;
};
type ApiManager = {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  scopes: Array<{
    scope: "space_timer" | "radicality" | "special_events";
    space_id: string | null;
    spaces: { name: string } | null;
  }>;
};
type ApiSpecial = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  teaser_seconds: number;
  points: number;
  delivery_targets?: string[];
  status: "draft" | "teaser" | "active" | "completed" | "cancelled";
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Falha ao carregar dados.");
  return response.json() as Promise<T>;
}

export function AdminDashboard({
  session,
  onExit,
}: {
  session: AdminSession;
  onExit: () => void;
}) {
  const [panel, setPanel] = useState<AdminPanel>("Visão geral");
  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
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
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={panel === label ? styles.activeNav : styles.navItem}
              onClick={() => setPanel(label)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
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
        {panel === "Visão geral" && <Overview onNavigate={setPanel} />}
        {panel === "Gestores" && <Managers />}
        {panel === "Experiências" && (
          <ExperienceList title="Experiências sem cronograma" kind="all" />
        )}
        {panel === "Desafios de Momento" && (
          <ExperienceList title="Desafios de Momento" kind="moment_challenge" />
        )}
        {panel === "Eventos especiais" && <SpecialEvents />}
        {panel === "Moderação geral" && (
          <Moderation queue="general" title="Fotos gerais" />
        )}
        {panel === "Moderação de desafio" && (
          <Moderation queue="challenge" title="Desafios de Momento" />
        )}
        {panel === "Participantes" && <Participants />}
        {panel === "Auditoria" && <Audit />}
        {panel === "Notificações" && <Notifications />}
      </section>
    </main>
  );
}

function Overview({ onNavigate }: { onNavigate: (panel: AdminPanel) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getJson<OverviewData>("/api/admin/overview")
      .then(setData)
      .catch(() => setError("A visão operacional está indisponível."));
  }, []);
  if (error) return <Failure message={error} />;
  return (
    <div className={styles.dashboard}>
      <section className={styles.statusBar}>
        <span>
          <i />
          Dados operacionais conectados
        </span>
        <span>Atualização sob demanda</span>
      </section>
      <section className={styles.metrics}>
        <Metric
          value={data?.activeUsers}
          label="Participantes ativos"
          detail="últimos 15 minutos"
        />
        <Metric
          value={data?.activeManagers}
          label="Gestores ativos"
          detail="contas operacionais"
        />
        <Metric
          value={data?.liveSpecialEvents}
          label="Eventos especiais"
          detail="em teaser ou ativos"
        />
        <Metric
          value={data?.interactionsToday}
          label="Interações hoje"
          detail="auditoria persistida"
        />
      </section>
      <section className={styles.columns}>
        <article className={styles.activity}>
          <SectionTitle kicker="Acompanhamento" title="Últimas ações" />
          {data ? (
            <ol>
              {data.activity.length ? (
                data.activity.map((item, index) => (
                  <li key={`${item.event_type}-${index}`}>
                    <span className={styles.activityDot} />
                    <div>
                      <strong>{humanize(item.event_type)}</strong>
                      <p>Registro operacional persistido</p>
                    </div>
                    <time>{formatDate(item.created_at)}</time>
                  </li>
                ))
              ) : (
                <Empty text="Nenhuma ação registrada ainda." />
              )}
            </ol>
          ) : (
            <Loading />
          )}
        </article>
        <article className={styles.attention}>
          <SectionTitle kicker="Decisão" title="Filas de moderação" />
          <p>
            {data
              ? `${data.pendingModeration} foto(s) geral(is) e ${data.pendingChallengeModeration} desafio(s) aguardam revisão.`
              : "Carregando filas."}
          </p>
          <div className={styles.inlineActions}>
            <button onClick={() => onNavigate("Moderação geral")}>
              Fotos gerais
            </button>
            <button onClick={() => onNavigate("Moderação de desafio")}>
              Desafios
            </button>
          </div>
        </article>
      </section>
      <section className={styles.quickActions}>
        <button onClick={() => onNavigate("Experiências")}>
          <CalendarClock size={20} />
          <span>
            <strong>{data?.openExperiences ?? "—"} experiências abertas</strong>
            <small>Crie stands, atividades e desafios</small>
          </span>
        </button>
        <button onClick={() => onNavigate("Eventos especiais")}>
          <Gamepad2 size={20} />
          <span>
            <strong>Operar eventos especiais</strong>
            <small>Teaser, QR e ciclo do evento</small>
          </span>
        </button>
        <button onClick={() => onNavigate("Notificações")}>
          <Bell size={20} />
          <span>
            <strong>Enviar comunicado</strong>
            <small>Push para os participantes</small>
          </span>
        </button>
      </section>
    </div>
  );
}

function Managers() {
  const [managers, setManagers] = useState<ApiManager[] | null>(null);
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      void getJson<{
        managers: ApiManager[];
        spaces: Array<{ id: string; name: string }>;
      }>("/api/admin/managers")
        .then((data) => {
          setManagers(data.managers);
          setSpaces(data.spaces);
        })
        .catch(() => setError("Não foi possível carregar os gestores.")),
    [],
  );
  useEffect(load, [load]);
  async function toggle(manager: ApiManager) {
    const response = await fetch("/api/admin/managers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: manager.id, active: !manager.is_active }),
    });
    if (!response.ok) {
      setError("A alteração não foi salva.");
      return;
    }
    load();
  }
  if (error) return <Failure message={error} />;
  if (!managers) return <Loading />;
  return (
    <div className={styles.dashboard}>
      <CreateManager spaces={spaces} onCreated={load} />
      <section className={styles.activity}>
        <SectionTitle
          kicker="Contas e escopos"
          title={`${managers.length} conta(s) operacional(is)`}
        />
        <p className={styles.help}>
          Cada conta entra por e-mail e senha e enxerga somente o escopo
          atribuído.
        </p>
        <ol>
          {managers.map((manager) => (
            <li key={manager.id}>
              <span className={styles.activityDot} />
              <div>
                <strong>{manager.display_name}</strong>
                <p>
                  {manager.email ?? "Sem e-mail"} ·{" "}
                  {manager.scopes.length
                    ? manager.scopes
                        .map(
                          (item) =>
                            `${scopeLabel(item.scope)}${item.spaces?.name ? ` — ${item.spaces.name}` : ""}`,
                        )
                        .join(", ")
                    : "Sem escopo atribuído"}
                </p>
              </div>
              <button
                className={
                  manager.is_active ? styles.ghostButton : styles.primaryButton
                }
                onClick={() => toggle(manager)}
              >
                {manager.is_active ? "Desativar" : "Ativar"}
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function CreateManager({
  spaces,
  onCreated,
}: {
  spaces: Array<{ id: string; name: string }>;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [scope, setScope] = useState<
    "space_timer" | "radicality" | "special_events"
  >("space_timer");
  const [spaceId, setSpaceId] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, scope, spaceId }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setMessage(result.error ?? "Não foi possível criar o gestor.");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setMessage("Conta de gestor criada.");
    onCreated();
  }
  return (
    <form className={styles.formCard} onSubmit={submit}>
      <SectionTitle kicker="Conta e escopo" title="Criar ou atualizar gestor" />
      <p className={styles.help}>
        Use o mesmo e-mail para substituir o escopo e renovar a senha de uma
        conta existente.
      </p>
      <div className={styles.formGrid}>
        <label>
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
          />
        </label>
        <label>
          E-mail
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </label>
        <label>
          Senha inicial ou nova
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>
        <label>
          Escopo
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as typeof scope)}
          >
            <option value="space_timer">Cronometrista de espaço</option>
            <option value="radicality">Gestor de Radicalidade</option>
            <option value="special_events">Gestor de eventos especiais</option>
          </select>
        </label>
        {scope === "space_timer" && (
          <label className={styles.fullField}>
            Espaço atribuído
            <select
              value={spaceId}
              onChange={(event) => setSpaceId(event.target.value)}
              required
            >
              <option value="">Selecione o espaço</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className={styles.formFooter}>
        <button className={styles.primaryButton}>Salvar acesso</button>
        {message && <p role="status">{message}</p>}
      </div>
    </form>
  );
}

function ExperienceList({
  title,
  kind,
}: {
  title: string;
  kind: "all" | "moment_challenge";
}) {
  const [items, setItems] = useState<ApiExperience[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      void getJson<{ experiences: ApiExperience[] }>(
        `/api/admin/experiences${kind === "all" ? "" : "?kind=moment_challenge"}`,
      )
        .then((data) =>
          setItems(
            kind === "all"
              ? data.experiences.filter((item) => item.kind !== "schedule")
              : data.experiences,
          ),
        )
        .catch(() => setError("Não foi possível carregar as experiências.")),
    [kind],
  );
  useEffect(load, [load]);
  async function startChallenge(item: ApiExperience) {
    const response = await fetch("/api/admin/experiences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status: "active" }),
    });
    if (!response.ok) {
      setError("Não foi possível iniciar o desafio.");
      return;
    }
    load();
  }
  if (error) return <Failure message={error} />;
  return (
    <div className={styles.dashboard}>
      <CreateExperience
        challenge={kind === "moment_challenge"}
        onCreated={load}
      />
      <section className={styles.activity}>
        <SectionTitle kicker="Catálogo persistido" title={title} />
        {!items ? (
          <Loading />
        ) : !items.length ? (
          <Empty text="Nada criado ainda. Use o formulário acima para incluir a primeira experiência." />
        ) : (
          <ol>
            {items.map((item) => (
              <li key={item.id}>
                <span className={styles.activityDot} />
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.description || "Sem descrição"} ·{" "}
                    {item.kind === "moment_challenge"
                      ? `foto vale ${item.moment_points} pontos · ${item.moment_duration_minutes ?? 5} min`
                      : `${item.check_in_points} pontos`}
                  </p>
                </div>
                <span className={styles.rowActions}>
                  <time>{humanize(item.status)}</time>
                  {item.kind === "moment_challenge" &&
                  ["draft", "paused"].includes(item.status) ? (
                    <button
                      className={styles.primaryButton}
                      onClick={() => void startChallenge(item)}
                    >
                      Iniciar desafio
                    </button>
                  ) : null}
                  {item.kind === "moment_challenge" && item.status === "active" ? (
                    <button
                      className={styles.ghostButton}
                      onClick={() =>
                        void fetch("/api/admin/experiences", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: item.id, status: "completed" }),
                        }).then(load)
                      }
                    >
                      Encerrar desafio
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function CreateExperience({
  challenge,
  onCreated,
}: {
  challenge: boolean;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(0);
  const [momentPoints, setMomentPoints] = useState(0);
  const [duration, setDuration] = useState("5");
  const [customDuration, setCustomDuration] = useState("");
  const [kind, setKind] = useState<"stand" | "activity">("stand");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        kind: challenge ? "moment_challenge" : kind,
        points,
        momentPoints: challenge ? momentPoints : 0,
        durationMinutes: challenge
          ? duration === "custom"
            ? Number(customDuration)
            : Number(duration)
          : undefined,
      }),
    });
    if (!response.ok) {
      setMessage("Não foi possível criar. Revise os dados.");
      return;
    }
    setName("");
    setDescription("");
    setPoints(0);
    setMomentPoints(0);
    setDuration("5");
    setCustomDuration("");
    setMessage("Experiência criada e disponível na operação.");
    onCreated();
  }
  return (
    <form className={styles.formCard} onSubmit={submit}>
      <SectionTitle
        kicker={challenge ? "Novo desafio" : "Nova experiência"}
        title={
          challenge
            ? "Crie um desafio que vale foto"
            : "Experiência sem cronograma"
        }
      />
      <div className={styles.formGrid}>
        <label>
          Nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
          />
        </label>
        {!challenge && (
          <label>
            Tipo
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "stand" | "activity")
              }
            >
              <option value="stand">Stand / roda</option>
              <option value="activity">Atividade extra</option>
            </select>
          </label>
        )}
        {!challenge && <label>
          Pontos no QR
          <input
            type="number"
            min="0"
            value={points}
            onChange={(event) => setPoints(Number(event.target.value))}
          />
        </label>}
        {challenge && (
          <label>
            Pontos da foto
            <input
              type="number"
              min="0"
              value={momentPoints}
              onChange={(event) => setMomentPoints(Number(event.target.value))}
            />
          </label>
        )}
        {challenge && (
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
        )}
        {challenge && duration === "custom" ? (
          <label>
            Minutos personalizados
            <input
              type="number"
              min="1"
              max="180"
              required
              value={customDuration}
              onChange={(event) => setCustomDuration(event.target.value)}
            />
          </label>
        ) : null}
        <label className={styles.fullField}>
          Descrição
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </label>
      </div>
      <div className={styles.formFooter}>
        <button className={styles.primaryButton} type="submit">
          Criar {challenge ? "desafio" : "experiência"}
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </form>
  );
}

function SpecialEvents() {
  const [events, setEvents] = useState<ApiSpecial[] | null>(null);
  const [error, setError] = useState("");
  const [activeQr, setActiveQr] = useState<{
    title: string;
    imageUrl: string;
    expiresAt?: string;
  } | null>(null);
  const load = useCallback(
    () =>
      void getJson<{ events: ApiSpecial[] }>("/api/admin/special-events")
        .then((data) => setEvents(data.events))
        .catch(() =>
          setError("Não foi possível carregar os eventos especiais."),
        ),
    [],
  );
  useEffect(load, [load]);
  async function transition(id: string, status: ApiSpecial["status"]) {
    const response = await fetch("/api/admin/special-events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      qrImageUrl?: string;
      expiresAt?: string;
    };
    if (!response.ok) {
      setError(result.error ?? "A transição não foi salva.");
      return;
    }
    if (result.qrImageUrl)
      setActiveQr({
        title:
          events?.find((event) => event.id === id)?.title ?? "Evento especial",
        imageUrl: result.qrImageUrl,
        expiresAt: result.expiresAt,
      });
    if (status === "completed" || status === "cancelled") setActiveQr(null);
    load();
  }
  if (error) return <Failure message={error} />;
  return (
    <div className={styles.dashboard}>
      <CreateSpecialEvent onCreated={load} />
      {activeQr && (
        <section className={styles.qrCard}>
          <div>
            <p>QR ativo</p>
            <h2>{activeQr.title}</h2>
            <small>
              Expira em{" "}
              {activeQr.expiresAt ? formatDate(activeQr.expiresAt) : "breve"}
            </small>
          </div>
          <img src={activeQr.imageUrl} alt={`QR Code de ${activeQr.title}`} />
        </section>
      )}
      <section className={styles.activity}>
        <SectionTitle kicker="Operação ao vivo" title="Eventos especiais" />
        {!events ? (
          <Loading />
        ) : !events.length ? (
          <Empty text="Nenhum evento especial criado." />
        ) : (
          <ol>
            {events.map((event) => (
              <li key={event.id}>
                <span className={styles.activityDot} />
                <div>
                  <strong>{event.title}</strong>
                  <p>
                    {event.points} pontos ·{" "}
                    {event.delivery_targets?.map(humanize).join(", ") || "App"}{" "}
                    · teaser de {event.teaser_seconds}s · até{" "}
                    {formatTime(event.ends_at)}
                  </p>
                </div>
                <span className={styles.rowActions}>
                  {event.status === "draft" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => transition(event.id, "teaser")}
                    >
                      Iniciar teaser
                    </button>
                  )}
                  {event.status === "teaser" && (
                    <button
                      className={styles.primaryButton}
                      onClick={() => transition(event.id, "active")}
                    >
                      Abrir QR
                    </button>
                  )}
                  {event.status === "active" && (
                    <button
                      className={styles.ghostButton}
                      onClick={() => transition(event.id, "completed")}
                    >
                      Encerrar
                    </button>
                  )}
                  <small>{humanize(event.status)}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function CreateSpecialEvent({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("5");
  const [customDuration, setCustomDuration] = useState("");
  const [points, setPoints] = useState(0);
  const [targets, setTargets] = useState<string[]>(["app"]);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const durationMinutes =
      duration === "custom" ? Number(customDuration) : Number(duration);
    const response = await fetch("/api/admin/special-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        durationMinutes,
        points,
        teaserSeconds: 15,
        targets,
      }),
    });
    if (!response.ok) {
      setMessage("Não foi possível criar o evento.");
      return;
    }
    setTitle("");
    setDuration("5");
    setCustomDuration("");
    setPoints(0);
    setTargets(["app"]);
    setMessage(
      "Evento especial criado. Inicie o teaser quando estiver pronto.",
    );
    onCreated();
  }
  function toggleTarget(target: string) {
    setTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }
  return (
    <form className={styles.formCard} onSubmit={submit}>
      <SectionTitle kicker="Novo evento" title="Evento especial com QR novo" />
      <div className={styles.formGrid}>
        <label>
          Nome
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={100}
          />
        </label>
        <label>
          Pontos
          <input
            type="number"
            min="0"
            value={points}
            onChange={(event) => setPoints(Number(event.target.value))}
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
        {duration === "custom" ? (
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
        ) : null}
        <fieldset className={`${styles.targetFields} ${styles.fullField}`}>
          <legend>Exibir em</legend>
          {[
            ["app", "App"],
            ["tv", "TV"],
            ["screen", "Telão"],
          ].map(([target, label]) => (
            <label key={target}>
              <input
                type="checkbox"
                checked={targets.includes(target)}
                onChange={() => toggleTarget(target)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <div className={styles.formFooter}>
        <button className={styles.primaryButton} disabled={!targets.length}>
          Criar evento
        </button>
        {message && <p role="status">{message}</p>}
      </div>
    </form>
  );
}

function Moderation({
  queue,
  title,
}: {
  queue: "general" | "challenge";
  title: string;
}) {
  const [moments, setMoments] = useState<AdminMoment[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      void getJson<{ moments: AdminMoment[] }>(
        `/api/admin/moderation?queue=${queue}`,
      )
        .then((data) => setMoments(data.moments))
        .catch(() => setError("Não foi possível carregar a fila.")),
    [queue],
  );
  useEffect(load, [load]);
  async function decide(
    moment: AdminMoment,
    action: "deny_points" | "delete_photo",
  ) {
    const response = await fetch("/api/admin/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: moment.id, action }),
    });
    if (!response.ok) {
      setError("A decisão não foi salva.");
      return;
    }
    setMoments(
      (current) => current?.filter((item) => item.id !== moment.id) ?? null,
    );
  }
  if (error && !moments) return <Failure message={error} />;
  return (
    <section className={styles.activity}>
      <SectionTitle
        kicker={
          queue === "challenge"
            ? "Validação do desafio"
            : "Segurança e conteúdo"
        }
        title={title}
      />
      <p className={styles.help}>
        {queue === "challenge"
          ? "A foto e os pontos são válidos no envio. Revise somente se precisar corrigir algo."
          : "As fotos entram aprovadas e pontuadas. Use as ações somente para corrigir uma publicação."}
      </p>
      {!moments ? (
        <Loading />
      ) : !moments.length ? (
        <Empty text="Fila limpa. Não há fotos aguardando sua decisão." />
      ) : (
        <ol>
          {moments.map((moment) => (
            <li className={styles.moderationItem} key={moment.id}>
              <span className={styles.activityDot} />
              {moment.imageUrl ? (
                <a
                  className={styles.moderationPhoto}
                  href={moment.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir foto de ${moment.participation?.participantName ?? "participante"} em tamanho maior`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={moment.imageUrl} alt={`Foto de ${moment.participation?.participantName ?? "participante"}`} />
                </a>
              ) : <span className={styles.moderationPhotoUnavailable}>Foto indisponível</span>}
              <div>
                <strong>
                  {moment.participation?.participantName ?? "Participante"}
                </strong>
                <p>
                  {moment.participation?.experienceName ?? "DNJ"} ·{" "}
                  {moment.points_awarded} pontos ·{" "}
                  {formatDate(moment.captured_at)}
                </p>
              </div>
              <span className={styles.rowActions}>
                <button
                  className={styles.ghostButton}
                  onClick={() => decide(moment, "deny_points")}
                >
                  Retirar pontos
                </button>
                <button
                  className={styles.dangerButton}
                  onClick={() => decide(moment, "delete_photo")}
                >
                  Excluir foto
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Participants() {
  const [users, setUsers] = useState<Array<{
    id: string;
    display_name: string;
    email: string | null;
    points: number;
    last_seen_at: string;
  }> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getJson<{ users: NonNullable<typeof users> }>("/api/admin/users")
      .then((data) => setUsers(data.users))
      .catch(() => setError("Não foi possível carregar participantes."));
  }, []);
  if (error) return <Failure message={error} />;
  if (!users) return <Loading />;
  return (
    <section className={styles.activity}>
      <SectionTitle
        kicker="Base do evento"
        title={`${users.length} participante(s)`}
      />
      <ol>
        {users.map((user) => (
          <li key={user.id}>
            <span className={styles.activityDot} />
            <div>
              <strong>{user.display_name}</strong>
              <p>
                {user.email ?? "Sem e-mail"} · {user.points} pontos
              </p>
            </div>
            <time>{formatDate(user.last_seen_at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Audit() {
  const [items, setItems] = useState<Array<{
    id: number;
    event_type: string;
    created_at: string;
    test_users: { display_name: string } | null;
  }> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getJson<{ activity: NonNullable<typeof items> }>("/api/admin/activity")
      .then((data) => setItems(data.activity))
      .catch(() => setError("Não foi possível carregar a auditoria."));
  }, []);
  if (error) return <Failure message={error} />;
  if (!items) return <Loading />;
  return (
    <section className={styles.activity}>
      <SectionTitle
        kicker="Registros persistidos"
        title="Auditoria operacional"
      />
      {items.length ? (
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <span className={styles.activityDot} />
              <div>
                <strong>{humanize(item.event_type)}</strong>
                <p>{item.test_users?.display_name ?? "Sistema"}</p>
              </div>
              <time>{formatDate(item.created_at)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <Empty text="Nenhum evento de auditoria encontrado." />
      )}
    </section>
  );
}

function Notifications() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    const response = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, target: "all" }),
    });
    const result = (await response.json()) as {
      delivered?: number;
      total?: number;
      error?: string;
    };
    setSending(false);
    setMessage(
      response.ok
        ? `Comunicado enviado para ${result.delivered} de ${result.total} dispositivo(s).`
        : (result.error ?? "Não foi possível enviar."),
    );
    if (response.ok) {
      setTitle("");
      setBody("");
    }
  }
  return (
    <section className={styles.activity}>
      <SectionTitle kicker="Comunicação" title="Enviar push" />
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
          {sending ? "Enviando…" : "Enviar para todos"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </section>
  );
}

function Metric({
  value,
  label,
  detail,
}: {
  value?: number;
  label: string;
  detail: string;
}) {
  return (
    <article className={styles.metric}>
      <strong>{value ?? "—"}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
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
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "horário a confirmar"
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function humanize(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function scopeLabel(scope: string) {
  return scope === "space_timer"
    ? "cronometrista"
    : scope === "radicality"
      ? "Radicalidade"
      : scope === "special_events"
        ? "eventos especiais"
        : "experiência";
}
