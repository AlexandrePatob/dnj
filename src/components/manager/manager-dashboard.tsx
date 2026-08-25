"use client";

import {
  FormEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Clock3,
  Gamepad2,
  LogOut,
  Pause,
  Pencil,
  Play,
  Plus,
  QrCode,
  Sparkles,
  Square,
  TimerReset,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./manager-dashboard.module.css";

type Scope = "space" | "actions" | "special_events";
type Session = {
  name?: string;
  email?: string;
  scope?: Scope;
  role?: Scope;
  manager?: { name?: string; email?: string; scope?: Scope };
};
type Participant = {
  id: string;
  name: string;
  checkedInAt?: string;
  result?: "first" | "second" | "third" | "participation";
};
type Item = {
  id: string;
  title: string;
  startsAt?: string;
  startedAt?: string;
  status?: string;
  flexMinutes?: number;
  spaceName?: string;
};
type Game = {
  id: string;
  name: string;
  points?: {
    first?: number;
    second?: number;
    third?: number;
    participation?: number;
  };
};
type Run = {
  id: string;
  gameId?: string;
  gameName?: string;
  status?: "checkin" | "running" | "paused" | "results";
  qrCode?: string;
  qrImageUrl?: string;
  participants?: Participant[];
};
type SpecialEvent = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  status?: "draft" | "teaser" | "active";
  qrCode?: string;
  qrImageUrl?: string;
  expiresAt?: string;
  qrAvailableAt?: string;
};
type Overview = {
  scope?: Scope;
  space?: { current?: Item; upcoming?: Item[] };
  actions?: { games?: Game[]; run?: Run | null };
  specialEvents?: { events?: SpecialEvent[] };
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok)
    throw new Error(
      ((await response.json().catch(() => ({}))) as { error?: string }).error ??
        "A ação não pôde ser concluída.",
    );
  return response.status === 204 ? null : response.json();
}
function getScope(session: Session, overview: Overview): Scope | undefined {
  return (
    session.manager?.scope ?? session.scope ?? session.role ?? overview.scope
  );
}
function time(value?: string) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
}
function call(
  path: string,
  body: object,
  refresh: () => Promise<void>,
  setError: (value: string) => void,
) {
  return api(path, { method: "POST", body: JSON.stringify(body) })
    .then(() => refresh())
    .catch((error: Error) => setError(error.message));
}

export function ManagerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const overviewPollInFlight = useRef(false);
  const load = useCallback(async () => {
    try {
      const [sessionData, overviewData] = await Promise.all([
        api("/api/manager/session"),
        api("/api/manager/overview"),
      ]);
      setSession(sessionData as Session);
      setOverview(overviewData as Overview);
      setError("");
    } catch {
      router.replace("/manager/login");
    }
  }, [router]);
  const loadRef = useRef(load);
  useEffect(() => {
    void loadRef.current();
  }, []); // Session is intentionally checked before any operation UI is shown.
  const activeRunId = overview?.actions?.run?.id;
  const managerScope =
    session && overview ? getScope(session, overview) : undefined;
  useEffect(() => {
    if (managerScope !== "actions" || !activeRunId) return;
    let active = true;
    const refreshRun = async () => {
      if (
        overviewPollInFlight.current ||
        document.visibilityState !== "visible"
      )
        return;
      overviewPollInFlight.current = true;
      try {
        const data = await api("/api/manager/overview");
        if (active) setOverview(data as Overview);
      } catch {
        // A leitura automática não interfere nas ações do gestor.
      } finally {
        overviewPollInFlight.current = false;
      }
    };
    const timer = window.setInterval(refreshRun, 2_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeRunId, managerScope]);
  async function signOut() {
    await fetch("/api/manager/session", { method: "DELETE" }).catch(() => null);
    router.replace("/manager/login");
  }
  if (!session || !overview)
    return <main className={styles.loading}>Carregando operação…</main>;
  const scope = getScope(session, overview);
  const name = session.manager?.name ?? session.name ?? "Gestor";
  const label =
    scope === "space"
      ? "Cronometrista"
      : scope === "actions"
        ? "Gestor de Radicalidade"
        : scope === "special_events"
          ? "Gestor de eventos especiais"
          : "Gestor DNJ";
  return (
    <main className={styles.shell}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>DNJ</span>
          <span>
            <strong>Operação DNJ</strong>
            <small>
              {label} · {name}
            </small>
          </span>
        </div>
        <button className={styles.logout} onClick={signOut}>
          <LogOut size={16} /> Sair
        </button>
      </header>
      <section className={styles.content}>
        <header className={styles.intro}>
          <div>
            <h1>
              {scope === "space"
                ? "Seu cronograma"
                : scope === "actions"
                  ? "Radicalidade"
                  : "Eventos especiais"}
            </h1>
            <p>
              {scope === "space"
                ? "Registre o horário real e mantenha a programação do seu espaço atualizada."
                : scope === "actions"
                  ? "Abra partidas, acompanhe os scans e confirme a pontuação de cada participante."
                  : "Prepare o anúncio, libere o QR no momento certo e acompanhe a experiência."}
            </p>
          </div>
          <span className={styles.scope}>{label}</span>
        </header>
        {error ? (
          <p role="alert" className={styles.error}>
            <AlertCircle size={17} />
            {error}
          </p>
        ) : null}
        {scope === "space" ? (
          <SpaceConsole
            data={overview.space}
            refresh={load}
            setError={setError}
          />
        ) : scope === "actions" ? (
          <ActionConsole
            data={overview.actions}
            refresh={load}
            setError={setError}
          />
        ) : scope === "special_events" ? (
          <SpecialConsole
            data={overview.specialEvents}
            refresh={load}
            setError={setError}
          />
        ) : (
          <Empty
            icon={<AlertCircle size={28} />}
            title="Conta sem escopo"
            text="Esta conta ainda não tem uma área operacional atribuída. Peça ao administrador para revisar as permissões."
          />
        )}
      </section>
    </main>
  );
}

function SpaceConsole({
  data,
  refresh,
  setError,
}: {
  data?: Overview["space"];
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const current = data?.current;
  if (!current)
    return (
      <Empty
        icon={<Clock3 size={28} />}
        title="Nenhum item em andamento"
        text="Quando uma atividade do seu espaço estiver disponível, ela aparecerá aqui para você iniciar no horário real."
      />
    );
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>
              {current.spaceName ?? "Espaço atribuído"}
            </p>
            <h2>{current.title}</h2>
          </div>
          <span className={styles.timer}>
            {current.flexMinutes
              ? `+${current.flexMinutes} min`
              : time(current.startedAt)}
          </span>
        </header>
        <ul className={styles.details}>
          <li>
            <span>Previsto</span>
            <strong>{time(current.startsAt)}</strong>
          </li>
          <li>
            <span>Início real</span>
            <strong>{time(current.startedAt)}</strong>
          </li>
          <li>
            <span>Tolerância</span>
            <strong>15 minutos</strong>
          </li>
        </ul>
        <div className={styles.actions}>
          {!current.startedAt ? (
            <button
              className={styles.button}
              onClick={() =>
                void call(
                  "/api/manager/space/start",
                  { itemId: current.id },
                  refresh,
                  setError,
                )
              }
            >
              <Play size={16} />
              Marcar início real
            </button>
          ) : (
            <button
              className={styles.secondary}
              onClick={() =>
                void call(
                  "/api/manager/space/flex",
                  { itemId: current.id },
                  refresh,
                  setError,
                )
              }
            >
              <TimerReset size={16} />
              Aplicar Flex time
            </button>
          )}
          <button
            className={styles.button}
            onClick={() =>
              void call(
                "/api/manager/space/advance",
                { itemId: current.id },
                refresh,
                setError,
              )
            }
          >
            <Clock3 size={16} />
            Avançar cronograma
          </button>
        </div>
      </section>
      <Schedule items={data?.upcoming ?? []} />
    </div>
  );
}

function Schedule({ items }: { items: Item[] }) {
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.kicker}>A seguir</p>
          <h2>Próximas atividades</h2>
        </div>
      </header>
      {items.length ? (
        <ul className={styles.eventList}>
          {items.map((item) => (
            <li key={item.id}>
              <span className={styles.eventIcon}>
                <Clock3 size={16} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.spaceName ?? "Seu espaço"}</small>
              </span>
              <time>{time(item.startsAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          Não há outra atividade programada para este espaço.
        </p>
      )}
    </section>
  );
}

function ActionConsole({
  data,
  refresh,
  setError,
}: {
  data?: Overview["actions"];
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [editor, setEditor] = useState<{ id?: string; name: string } | null>(
    null,
  );
  const [qrImageUrl, setQrImageUrl] = useState<string>();
  const run = data?.run;
  async function saveGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor?.name.trim()) return;
    try {
      await api("/api/manager/actions/games", {
        method: editor.id ? "PATCH" : "POST",
        body: JSON.stringify(
          editor.id
            ? { gameId: editor.id, name: editor.name.trim() }
            : { name: editor.name.trim() },
        ),
      });
      setEditor(null);
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function openRun(gameId: string) {
    try {
      const created = (await api("/api/manager/actions/runs", {
        method: "POST",
        body: JSON.stringify({ gameId }),
      })) as { qrImageUrl?: string };
      setQrImageUrl(created.qrImageUrl);
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  if (run)
    return (
      <RunConsole
        run={{ ...run, qrImageUrl: qrImageUrl ?? run.qrImageUrl }}
        refresh={refresh}
        setError={setError}
      />
    );
  const games = data?.games ?? [];
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Nova partida</p>
            <h2>Abrir Radicalidade</h2>
          </div>
          <Gamepad2 size={21} />
        </header>
        {games.length ? (
          <div className={styles.gameGrid}>
            {games.map((game) => (
              <article className={styles.gameCard} key={game.id}>
                <strong>{game.name}</strong>
                <div>
                  <button
                    className={styles.secondary}
                    onClick={() => void openRun(game.id)}
                  >
                    <QrCode size={16} />
                    Abrir partida
                  </button>
                  <button
                    className={styles.iconButton}
                    aria-label={`Editar ${game.name}`}
                    onClick={() => setEditor({ id: game.id, name: game.name })}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Gamepad2 size={28} />}
            title="Nenhum jogo disponível"
            text="Crie o primeiro jogo abaixo para iniciar uma partida."
          />
        )}
      </section>
      <button className={styles.button} onClick={() => setEditor({ name: "" })}>
        <Plus size={16} />
        Novo jogo
      </button>
      {editor ? (
        <div className={styles.dialogBackdrop} role="presentation">
          <form
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editor.id ? "Editar jogo" : "Novo jogo"}
            onSubmit={(event) => void saveGame(event)}
          >
            <h2>{editor.id ? "Editar jogo" : "Novo jogo"}</h2>
            <label>
              Nome do jogo
              <input
                autoFocus
                value={editor.name}
                onChange={(event) =>
                  setEditor({ ...editor, name: event.target.value })
                }
                maxLength={80}
                placeholder="Ex.: Corrida do saco"
                required
              />
            </label>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondary}
                type="button"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
              <button className={styles.button} type="submit">
                Salvar jogo
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function RunConsole({
  run,
  refresh,
  setError,
}: {
  run: Run;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [results, setResults] = useState<Record<string, Participant["result"]>>(
    {},
  );
  const [qrImageUrl, setQrImageUrl] = useState(run.qrImageUrl);
  const people = run.participants ?? [];
  const saveResults = () =>
    call(
      "/api/manager/actions/results",
      {
        runId: run.id,
        results: people.map((person) => ({
          participantId: person.id,
          result: results[person.id] ?? person.result ?? "participation",
        })),
      },
      refresh,
      setError,
    );
  async function renewQr() {
    try {
      const created = (await api(`/api/manager/actions/runs/${run.id}/qr`, {
        method: "POST",
      })) as { qrImageUrl?: string };
      setQrImageUrl(created.qrImageUrl);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const label =
    run.status === "running"
      ? "Partida em andamento"
      : run.status === "paused"
        ? "Partida pausada"
        : run.status === "results"
          ? "Definir classificação"
          : "Aguardando scans";
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.kicker}>{label}</p>
          <h2>{run.gameName ?? "Partida de Radicalidade"}</h2>
        </div>
        <span className={styles.scope}>{people.length} pessoas</span>
      </header>
      {run.status === "checkin" || !run.status ? (
        <>
          <div className={styles.qr}>
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="QR Code da partida"
                style={{
                  width: 178,
                  height: 178,
                  borderRadius: 12,
                  background: "white",
                  padding: 10,
                }}
              />
            ) : (
              <div className={styles.qrCanvas}>
                <span>
                  <QrCode size={66} />
                </span>
              </div>
            )}
            <strong>{qrImageUrl ? "QR ativo" : "QR ainda não exibido"}</strong>
            <p>
              {qrImageUrl
                ? "Apresente o QR aos participantes."
                : "Gere um QR novo para receber participantes nesta partida."}
            </p>
          </div>
          <ParticipantList
            people={people}
            results={results}
            onResult={setResults}
            readonly
          />
          <div className={styles.actions}>
            {qrImageUrl ? (
              <button
                className={styles.button}
                onClick={() =>
                  void call(
                    "/api/manager/actions/start",
                    { runId: run.id },
                    refresh,
                    setError,
                  )
                }
              >
                <Play size={16} />
                Iniciar jogo
              </button>
            ) : (
              <button className={styles.button} onClick={() => void renewQr()}>
                <QrCode size={16} />
                Gerar novo QR
              </button>
            )}
            <button className={styles.secondary} onClick={() => void renewQr()}>
              <TimerReset size={16} />
              Novo QR
            </button>
            <button
              className={styles.danger}
              onClick={() =>
                void call(
                  "/api/manager/actions/close",
                  { runId: run.id },
                  refresh,
                  setError,
                )
              }
            >
              <Square size={16} />
              Cancelar partida
            </button>
          </div>
        </>
      ) : run.status === "running" || run.status === "paused" ? (
        <>
          <ParticipantList
            people={people}
            results={results}
            onResult={setResults}
            readonly
          />
          <div className={styles.actions}>
            {run.status === "running" ? (
              <button
                className={styles.secondary}
                onClick={() =>
                  void call(
                    "/api/manager/actions/pause",
                    { runId: run.id },
                    refresh,
                    setError,
                  )
                }
              >
                <Pause size={16} />
                Pausar
              </button>
            ) : (
              <button
                className={styles.button}
                onClick={() =>
                  void call(
                    "/api/manager/actions/start",
                    { runId: run.id },
                    refresh,
                    setError,
                  )
                }
              >
                <Play size={16} />
                Retomar
              </button>
            )}
            <button
              className={styles.danger}
              onClick={() =>
                void call(
                  "/api/manager/actions/finish",
                  { runId: run.id },
                  refresh,
                  setError,
                )
              }
            >
              <Trophy size={16} />
              Encerrar e pontuar
            </button>
          </div>
        </>
      ) : (
        <>
          <ParticipantList
            people={people}
            results={results}
            onResult={setResults}
          />
          <div className={styles.actions}>
            <button
              className={styles.button}
              onClick={() => void saveResults()}
            >
              <Trophy size={16} />
              Confirmar pontuação
            </button>
            <button
              className={styles.danger}
              onClick={() =>
                void call(
                  "/api/manager/actions/close",
                  { runId: run.id },
                  refresh,
                  setError,
                )
              }
            >
              <Square size={16} />
              Fechar partida
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ParticipantList({
  people,
  results,
  onResult,
  readonly = false,
}: {
  people: Participant[];
  results: Record<string, Participant["result"]>;
  onResult: Dispatch<SetStateAction<Record<string, Participant["result"]>>>;
  readonly?: boolean;
}) {
  return (
    <ul className={styles.participants}>
      {people.length ? (
        people.map((person) => (
          <li key={person.id}>
            <span>
              <strong>{person.name}</strong>
              <small>
                {person.checkedInAt
                  ? `Entrou às ${time(person.checkedInAt)}`
                  : "Participante confirmado"}
              </small>
            </span>
            {readonly ? (
              <span className={styles.scope}>
                {results[person.id] ?? person.result ?? "Participando"}
              </span>
            ) : (
              <select
                aria-label={`Resultado de ${person.name}`}
                value={results[person.id] ?? person.result ?? "participation"}
                onChange={(event) =>
                  onResult((current) => ({
                    ...current,
                    [person.id]: event.target.value as Participant["result"],
                  }))
                }
              >
                <option value="first">1º lugar</option>
                <option value="second">2º lugar</option>
                <option value="third">3º lugar</option>
                <option value="participation">Participação</option>
              </select>
            )}
          </li>
        ))
      ) : (
        <li>
          <span>
            <strong>Nenhum participante ainda</strong>
            <small>Os participantes aparecem após escanearem o QR.</small>
          </span>
        </li>
      )}
    </ul>
  );
}

function SpecialConsole({
  data,
  refresh,
  setError,
}: {
  data?: Overview["specialEvents"];
  refresh: () => Promise<void>;
  setError: (value: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [duration, setDuration] = useState("5");
  const [customDuration, setCustomDuration] = useState("");
  const [targets, setTargets] = useState<string[]>(["app"]);
  const [activeQr, setActiveQr] = useState<{
    eventId: string;
    title: string;
    imageUrl: string;
    expiresAt?: string;
  } | null>(null);
  const events = data?.events ?? [];
  function toggleTarget(target: string) {
    setTargets((current) =>
      current.includes(target)
        ? current.filter((item) => item !== target)
        : [...current, target],
    );
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const durationMinutes =
        duration === "custom" ? Number(customDuration) : Number(duration);
      await api("/api/manager/special-events", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          points: Number(points) || undefined,
          durationMinutes,
          targets,
        }),
      });
      setTitle("");
      setDescription("");
      setPoints("");
      setDuration("5");
      setCustomDuration("");
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function operate(event: SpecialEvent) {
    const path =
      event.status === "draft"
        ? "/api/manager/special-events/teaser"
        : event.status === "teaser"
          ? "/api/manager/special-events/qr"
          : "/api/manager/special-events/close";
    try {
      const result = (await api(path, {
        method: "POST",
        body: JSON.stringify({ eventId: event.id }),
      })) as { qrImageUrl?: string; expiresAt?: string };
      if (result?.qrImageUrl)
        setActiveQr({
          eventId: event.id,
          title: event.title,
          imageUrl: result.qrImageUrl,
          expiresAt: result.expiresAt ?? event.expiresAt,
        });
      if (event.status === "active")
        setActiveQr((current) =>
          current?.eventId === event.id ? null : current,
        );
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function renewQr(event: SpecialEvent) {
    try {
      const result = (await api("/api/manager/special-events/qr", {
        method: "POST",
        body: JSON.stringify({ eventId: event.id }),
      })) as { qrImageUrl: string; expiresAt?: string };
      setActiveQr({
        eventId: event.id,
        title: event.title,
        imageUrl: result.qrImageUrl,
        expiresAt: result.expiresAt ?? event.expiresAt,
      });
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const visibleQr = activeQr;
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Novo evento</p>
            <h2>Criar evento especial</h2>
          </div>
          <Sparkles size={21} />
        </header>
        <form className={styles.form} onSubmit={(event) => void create(event)}>
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
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              type="number"
              min="0"
              inputMode="numeric"
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
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className={styles.kicker} style={{ marginBottom: 8 }}>
              Exibir em
            </legend>
            {[
              ["app", "App"],
              ["tv", "TV"],
              ["screen", "Telão"],
            ].map(([id, label]) => (
              <label
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginRight: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={targets.includes(id)}
                  onChange={() => toggleTarget(id)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button
            className={styles.button}
            type="submit"
            disabled={!targets.length}
          >
            <Sparkles size={16} />
            Criar evento
          </button>
        </form>
      </section>
      {visibleQr ? (
        <section className={styles.panel}>
          <div className={styles.qr}>
            <img
              src={visibleQr.imageUrl}
              alt={`QR Code do evento ${visibleQr.title}`}
              style={{
                width: 178,
                height: 178,
                borderRadius: 12,
                background: "white",
                padding: 10,
              }}
            />
            <strong>{visibleQr.title}</strong>
            <p>
              {visibleQr.expiresAt
                ? `QR ativo até ${time(visibleQr.expiresAt)}.`
                : "QR ativo."}
            </p>
          </div>
        </section>
      ) : null}
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Ao vivo</p>
            <h2>Eventos preparados</h2>
          </div>
        </header>
        {events.length ? (
          <ul className={styles.eventList}>
            {events.map((event) => (
              <li key={event.id}>
                <span className={styles.eventIcon}>
                  <Sparkles size={16} />
                </span>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.status === "teaser"
                      ? "Teaser em andamento"
                      : event.status === "active"
                        ? "QR ativo"
                        : "Pronto para o teaser"}
                  </small>
                </span>
                {event.status === "active" ? (
                  <span style={{ display: "grid", gap: 4 }}>
                    <button onClick={() => void renewQr(event)}>
                      Gerar novo QR
                    </button>
                    <button onClick={() => void operate(event)}>
                      Encerrar
                    </button>
                  </span>
                ) : (
                  <button onClick={() => void operate(event)}>
                    {event.status === "draft" ? "Teaser 15 s" : "Liberar QR"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>
            Crie um evento para iniciar o teaser e gerar um QR novo.
          </p>
        )}
      </section>
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.empty}>
        {icon}
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </section>
  );
}
