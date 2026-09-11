"use client";

import {
  FormEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gamepad2,
  LogOut,
  MapPin,
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
import { toDataURL } from "qrcode";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/lib/auth-storage";
import { apiMutation, apiRequest } from "@/lib/api/client";
import styles from "./manager-dashboard.module.css";
import { PastoralQueueConsole } from "./pastoral-queue-console";

const MANAGER_RUN_POLL_MS = 15_000;
const MANAGER_SPACE_POLL_MS = 15_000;

type Scope = "space" | "actions" | "special_events" | "pastoral_queue";
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
  endsAt?: string;
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
  run?: Run | null;
};
type Run = {
  id: string;
  gameId?: string;
  gameName?: string;
  status?: "checkin" | "running" | "paused" | "results";
  qrCode?: string;
  qrImageUrl?: string;
  qrToken?: string;
  qrExpiresAt?: string;
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
  space?: { now?: Item[]; upcoming?: Item[] };
  actions?: { games?: Game[]; run?: Run | null };
  specialEvents?: { events?: SpecialEvent[] };
};

async function api(path: string, init?: RequestInit) {
  if (!path.startsWith("/api/")) {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    return init?.method && init.method !== "GET"
      ? apiMutation(path, { method: init.method, body })
      : apiRequest(path);
  }
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
const managerScopes: readonly Scope[] = ["space", "actions", "special_events", "pastoral_queue"];
function readManagerScope(value: unknown): Scope | undefined {
  return typeof value === "string" && managerScopes.includes(value as Scope) ? (value as Scope) : undefined;
}
function getScope(session: Session, overview: Overview): Scope | undefined {
  if (session.manager?.scope) return session.manager.scope;
  if (overview.scope) return overview.scope;
  return session.scope === "pastoral_queue" ? session.scope : undefined;
}
function time(value?: string) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";
}
function countdown(value: string | undefined, nowMs: number) {
  if (!value) return null;
  const seconds = Math.max(0, Math.ceil((new Date(value).getTime() - nowMs) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
function call(
  path: string,
  body: object | undefined,
  refresh: () => Promise<void>,
  setError: (value: string) => void,
) {
  return api(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })
    .then(() => refresh())
    .catch((error: Error) => setError(error.message));
}

export function ManagerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [isManagingAction, setIsManagingAction] = useState(false);
  const overviewPollInFlight = useRef(false);
  const load = useCallback(async () => {
    try {
      // The external API restores the session from the stored bearer token
      // and is the only authority on the EVENT_MANAGER role and its scope.
      if (!authStorage.getAccessToken()) throw new Error("Sessão expirada.");
      const identity = await authApi.getSession();
      if (identity.user.role !== "EVENT_MANAGER") { authStorage.clearCredentials(); throw new Error("Esta conta não tem acesso a esta área."); }
      const manager = { name: identity.user.name || identity.user.email, email: identity.user.email, scope: readManagerScope(identity.user.scope) };
      const sessionData: Session = { manager, ...manager };
      const scope = sessionData.manager?.scope ?? sessionData.scope;
      const overviewData = scope === "pastoral_queue"
        ? { scope }
        : scope === "special_events"
          ? { scope, specialEvents: await api("/manager/special-events") }
          : await api("/manager/game-overview");
      setSession(sessionData);
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
  const managerScope =
    session && overview ? getScope(session, overview) : undefined;
  useEffect(() => {
    if (managerScope !== "actions") return;
    let active = true;
    const refreshOverview = async () => {
      if (
        overviewPollInFlight.current ||
        document.visibilityState !== "visible"
      )
        return;
      overviewPollInFlight.current = true;
      try {
        const data = await api("/manager/game-overview");
        if (active) setOverview(data as Overview);
      } catch {
        // A leitura automática não interfere nas ações do gestor.
      } finally {
        overviewPollInFlight.current = false;
      }
    };
    const timer = window.setInterval(refreshOverview, MANAGER_RUN_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [managerScope]);
  useEffect(() => {
    if (managerScope !== "space") return;
    let active = true;
    const refreshSchedule = async () => {
      if (overviewPollInFlight.current || document.visibilityState !== "visible") return;
      overviewPollInFlight.current = true;
      try {
        const data = await api("/manager/game-overview");
        if (active) setOverview(data as Overview);
      } catch {
        // A leitura automática não interfere nas ações do gestor.
      } finally {
        overviewPollInFlight.current = false;
      }
    };
    const timer = window.setInterval(refreshSchedule, MANAGER_SPACE_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [managerScope]);
  async function signOut() {
    await authApi.logout();
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
        : scope === "pastoral_queue"
          ? "Gestor das filas"
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
        {!(scope === "actions" && isManagingAction) ? <header className={styles.intro}>
          <div>
            <h1>
              {scope === "space"
                ? "Sua programação"
                : scope === "actions"
                  ? "Radicalidade"
                : scope === "pastoral_queue"
                  ? "Filas"
                  : "Eventos especiais"}
            </h1>
            <p>
              {scope === "space"
                ? "Acompanhe todos os espaços, registre o horário real e mantenha a programação atualizada."
                : scope === "actions"
                  ? "Gerencie partidas e pontuação."
                : scope === "pastoral_queue"
                  ? "Acompanhe e opere as filas de Confissão e Direção Espiritual."
                  : "Prepare o anúncio, libere o QR no momento certo e acompanhe a experiência."}
            </p>
          </div>
          <span className={styles.scope}>{label}</span>
        </header> : null}
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
            onManagingChange={setIsManagingAction}
          />
        ) : scope === "special_events" ? (
          <SpecialConsole
            data={overview.specialEvents}
            refresh={load}
            setError={setError}
          />
        ) : scope === "pastoral_queue" ? (
          <PastoralQueueConsole />
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
  const now = data?.now ?? [];
  const upcoming = data?.upcoming ?? [];
  const [manualItem, setManualItem] = useState<Item | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const grouped = upcoming.reduce<Record<string, Item[]>>((groups, item) => {
    const key = item.spaceName ?? "Espaço a confirmar";
    (groups[key] ??= []).push(item);
    return groups;
  }, {});
  const operate = async (path: string, item: Item, body?: object) => {
    setBusyId(item.id);
    try {
      await api(path, { method: "POST", body: JSON.stringify({ itemId: item.id, ...body }) });
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusyId(null);
    }
  };
  const openManual = (item: Item) => {
    const initial = item.startedAt ? new Date(item.startedAt) : new Date();
    initial.setSeconds(0, 0);
    setManualValue(localDateTimeValue(initial));
    setManualItem(item);
  };
  const saveManual = async () => {
    if (!manualItem || !manualValue) return;
    await operate("/manager/space/start", manualItem, { startedAt: new Date(manualValue).toISOString() });
    setManualItem(null);
  };
  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}><CalendarDays size={14} /> Operação ao vivo</p>
            <h2>Acontecendo agora</h2>
          </div>
          <span className={styles.scope}>{now.length} {now.length === 1 ? "atividade" : "atividades"}</span>
        </header>
        {now.length ? <div className={styles.scheduleCards}>{now.map((item) => <ScheduleCard key={item.id} item={item} nowMs={nowMs} busy={busyId === item.id} operate={operate} openManual={openManual} />)}</div> : <p className={styles.empty}><Clock3 size={28} /><strong>Nenhuma atividade acontecendo agora</strong><span>As atividades em andamento aparecerão aqui agrupadas por espaço.</span></p>}
      </section>
      <Schedule groups={grouped} nowMs={nowMs} busyId={busyId} operate={operate} openManual={openManual} />
      {manualItem ? <div className={styles.dialogBackdrop} role="presentation"><section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="manual-start-title"><div><p className={styles.kicker}>Ajuste operacional</p><h2 id="manual-start-title">Início real</h2><p>Informe quando “{manualItem.title}” começou. O horário não pode estar no futuro.</p></div><label>Data e hora<input type="datetime-local" value={manualValue} max={localDateTimeValue(new Date())} onChange={(event) => setManualValue(event.target.value)} /></label><div className={styles.dialogActions}><button className={styles.secondary} onClick={() => setManualItem(null)}>Cancelar</button><button className={styles.button} onClick={() => void saveManual()} disabled={!manualValue || busyId === manualItem.id}>Salvar início</button></div></section></div> : null}
    </div>
  );
}
function localDateTimeValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function ScheduleCard({ item, nowMs, busy, operate, openManual }: { item: Item; nowMs: number; busy: boolean; operate: (path: string, item: Item, body?: object) => Promise<void>; openManual: (item: Item) => void }) {
  const started = Boolean(item.startedAt);
  const canOperate = item.status === "active" || item.status === "paused";
  const canStartNow = !started && (!item.startsAt || new Date(item.startsAt).getTime() > nowMs);
  const skip = () => { if (window.confirm(`Pular a atividade “${item.title}”?`)) void operate("/manager/space/advance", item); };
  return <article className={styles.scheduleCard}><div className={styles.scheduleCardHeader}><div><p className={styles.kicker}><MapPin size={13} /> {item.spaceName ?? "Espaço a confirmar"}</p><h3>{item.title}</h3></div><span className={styles.timer}>{started ? `Início ${time(item.startedAt)}` : time(item.startsAt)}</span></div><div className={styles.scheduleMeta}><span>Previsto {time(item.startsAt)}–{time(item.endsAt)}</span>{item.flexMinutes ? <span>+{item.flexMinutes} min</span> : null}{!canOperate ? <span>Aguardando ativação</span> : null}</div>{canOperate ? <div className={styles.cardActions}>{!started ? <>{canStartNow ? <button className={styles.button} disabled={busy} onClick={() => void operate("/manager/space/start", item)}><Play size={15} /> Iniciar agora</button> : null}<button className={styles.secondary} disabled={busy} onClick={() => openManual(item)}><Pencil size={15} /> Ajustar início</button></> : <button className={styles.secondary} disabled={busy} onClick={() => void operate("/manager/space/flex", item)}><TimerReset size={15} /> Aplicar Flex time</button>}<button className={styles.danger} disabled={busy} onClick={skip}><CheckCircle2 size={15} /> Pular atividade</button></div> : null}</article>;
}

function Schedule({ groups, nowMs, busyId, operate, openManual }: { groups: Record<string, Item[]>; nowMs: number; busyId: string | null; operate: (path: string, item: Item, body?: object) => Promise<void>; openManual: (item: Item) => void }) {
  const spaces = Object.entries(groups);
  return (
    <details className={styles.panel}>
      <summary className={`${styles.panelHeader} ${styles.accordionHeader}`}>
        <div>
          <p className={styles.kicker}>A seguir</p>
          <h2>Próximas atividades por espaço</h2>
        </div>
      </summary>
      {spaces.length ? (
        <div className={styles.spaceGroups}>{spaces.map(([space, items]) => <section key={space} className={styles.spaceGroup}><h3><MapPin size={15} />{space}<small>{items.length} {items.length === 1 ? "atividade" : "atividades"}</small></h3>{items.map((item) => <ScheduleCard key={item.id} item={item} nowMs={nowMs} busy={busyId === item.id} operate={operate} openManual={openManual} />)}</section>)}</div>
      ) : (
        <p className={styles.empty}>
          <CheckCircle2 size={28} /><strong>Programação em dia</strong><span>Não há outras atividades pendentes.</span>
        </p>
      )}
    </details>
  );
}

function ActionConsole({
  data,
  refresh,
  setError,
  mode = "actions",
  onManagingChange,
}: {
  data?: Overview["actions"];
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  mode?: "actions" | "special_events";
  onManagingChange?: (value: boolean) => void;
}) {
  const [editor, setEditor] = useState<{ id?: string; name: string } | null>(
    null,
  );
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  async function saveGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor?.name.trim()) return;
    try {
      await api(editor.id ? `/manager/games/${editor.id}` : "/manager/games", {
        method: editor.id ? "PATCH" : "POST",
        body: JSON.stringify(
          { name: editor.name.trim() },
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
      const created = (await api("/manager/runs", {
        method: "POST",
        body: JSON.stringify({ gameId }),
      })) as { id: string };
      // A newly opened run must be immediately usable: provision its QR in
      // the same flow instead of requiring a second manual action.
      await api(`/manager/runs/${created.id}/qr`, {
        method: "POST",
      });
      await refresh();
      setSelectedGameId(gameId);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const games = data?.games ?? [];
  const selectedGame = games.find((game) => game.id === selectedGameId);
  useEffect(() => {
    onManagingChange?.(Boolean(selectedGame?.run));
  }, [onManagingChange, selectedGame?.run]);
  if (selectedGame?.run) {
    return (
      <section className={styles.managerConsole} aria-label={`Gerenciar ${selectedGame.name}`}>
        <div className={styles.managerConsoleHeader}>
          <button className={styles.iconButton} aria-label="Voltar para atividades" onClick={() => setSelectedGameId(null)}>
            <ArrowLeft size={20} />
          </button>
          <h2>{selectedGame.name}</h2>
          <span aria-hidden="true" />
        </div>
        {mode === "special_events" ? (
          <SpecialEventRunConsole run={selectedGame.run} refresh={refresh} setError={setError} />
        ) : (
          <RunConsole run={selectedGame.run} refresh={refresh} setError={setError} />
        )}
      </section>
    );
  }
  return (
    <div className={styles.stack}>
      <button className={styles.button} onClick={() => setEditor({ name: "" })}>
        <Plus size={16} />
        {mode === "special_events" ? "Novo evento" : "Novo jogo"}
      </button>
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            {mode === "special_events" ? <p className={styles.kicker}>Evento pronto</p> : null}
            <h2>{mode === "special_events" ? "Eventos especiais" : "Partidas"}</h2>
          </div>
          <Gamepad2 size={21} />
        </header>
        {games.length ? (
          <div className={styles.gameGrid} role="table" aria-label={mode === "special_events" ? "Eventos" : "Partidas"}>
            <div className={styles.gameGridHeader} role="row" aria-hidden="true">
              <span>Atividade</span>
              <span>Ações</span>
            </div>
            {games.map((game) => <GameCard key={game.id} game={game} mode={mode} openRun={openRun} manageGame={setSelectedGameId} refresh={refresh} setError={setError} setEditor={setEditor} />)}
          </div>
        ) : (
          <Empty
            icon={<Gamepad2 size={28} />}
            title={mode === "special_events" ? "Nenhum evento preparado" : "Nenhum jogo disponível"}
            text={mode === "special_events" ? "Crie um evento e libere o QR quando estiver pronto." : "Crie o primeiro jogo abaixo para iniciar uma partida."}
          />
        )}
      </section>
      {editor ? (
        <div className={styles.dialogBackdrop} role="presentation">
          <form
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={editor.id ? "Editar jogo" : "Novo jogo"}
            onSubmit={(event) => void saveGame(event)}
          >
            <h2>{editor.id ? (mode === "special_events" ? "Editar evento" : "Editar jogo") : (mode === "special_events" ? "Novo evento" : "Novo jogo")}</h2>
            <label>
              {mode === "special_events" ? "Nome do evento" : "Nome do jogo"}
              <input
                autoFocus
                value={editor.name}
                onChange={(event) =>
                  setEditor({ ...editor, name: event.target.value })
                }
                maxLength={80}
                placeholder={mode === "special_events" ? "Ex.: Caça ao tesouro" : "Ex.: Corrida do saco"}
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
                {mode === "special_events" ? "Salvar evento" : "Salvar jogo"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function GameCard({
  game,
  mode,
  openRun,
  manageGame,
  refresh,
  setError,
  setEditor,
}: {
  game: Game;
  mode: "actions" | "special_events";
  openRun: (gameId: string) => Promise<void>;
  manageGame: (gameId: string) => void;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setEditor: Dispatch<SetStateAction<{ id?: string; name: string } | null>>;
}) {
  const run = game.run ?? null;
  const runLabel = run
    ? "Aberta"
    : "Disponível";
  return (
    <article className={`${styles.gameCard} ${run ? styles.gameCardLive : ""}`} role="row">
      <div className={styles.gameCardInfo}>
        <div className={styles.gameCardHeader}>
          <span>
            {mode === "special_events" ? <span className={styles.kicker}>Evento</span> : null}
            <strong>{game.name}</strong>
          </span>
          <span className={styles.gameState}>{runLabel}</span>
        </div>
        <div className={styles.gameCardMeta}>
          <span>{run ? "Sala pronta para gerenciar" : "Nenhuma partida aberta"}</span>
        </div>
      </div>
      <div className={styles.cardActions}>
        {run ? (
          <button className={styles.button} aria-label="Entrar na partida" onClick={() => manageGame(game.id)}>
            <Gamepad2 size={16} /> Entrar
          </button>
        ) : (
          <button className={styles.button} aria-label={mode === "special_events" ? "Liberar QR" : "Iniciar partida"} onClick={() => void openRun(game.id)}>
            <QrCode size={16} /> {mode === "special_events" ? "Liberar QR" : "Iniciar"}
          </button>
        )}
        <button className={styles.secondary} aria-label="Editar nome" onClick={() => setEditor({ id: game.id, name: game.name })}>
          <Pencil size={16} /> Editar
        </button>
        {!run && mode === "actions" ? (
          <button className={styles.danger} aria-label="Encerrar atividade" onClick={() => void call(`/manager/activities/${game.id}/conclude`, undefined, refresh, setError)}>
            <Square size={16} /> Encerrar
          </button>
        ) : null}
      </div>
    </article>
  );
}

function SpecialEventRunConsole({ run, refresh, setError }: { run: Run; refresh: () => Promise<void>; setError: (value: string) => void }) {
  const [qrImageUrl, setQrImageUrl] = useState(run.qrImageUrl);
  useEffect(() => {
    if (run.qrToken) void toDataURL(run.qrToken).then(setQrImageUrl);
  }, [run.qrToken]);
  const people = run.participants ?? [];
  async function renewQr() {
    try {
      const qr = await api(`/manager/runs/${run.id}/qr`, { method: "POST" }) as { qrToken: string };
      setQrImageUrl(await toDataURL(qr.qrToken));
    } catch (error) { setError((error as Error).message); }
  }
  return <section className={styles.panel}>
    <header className={styles.panelHeader}><div><p className={styles.kicker}>QR liberado</p><h2>{run.gameName ?? "Evento especial"}</h2></div><span className={styles.scope}>{people.length} participantes</span></header>
    <div className={styles.qr}>{qrImageUrl ? <img src={qrImageUrl} alt="QR Code do evento especial" style={{ width: 178, height: 178, borderRadius: 12, background: "white", padding: 10 }} /> : <div className={styles.qrCanvas}><QrCode size={66} /></div>}<strong>{qrImageUrl ? "QR ativo" : "Gere um QR para o evento"}</strong><p>Os participantes usam este QR para entrar no evento.</p></div>
    <ParticipantList people={people} results={{}} onResult={() => undefined} readonly />
    <div className={styles.actions}><button className={styles.secondary} onClick={() => void renewQr()}><TimerReset size={16} />Gerar novo QR</button><button className={styles.danger} onClick={() => void call(`/manager/runs/${run.id}/cancel`, undefined, refresh, setError)}><Square size={16} />Encerrar evento</button></div>
  </section>;
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
  const [reviewingResults, setReviewingResults] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(run.qrImageUrl);
  useEffect(() => {
    if (run.qrToken) void toDataURL(run.qrToken).then(setQrImageUrl);
  }, [run.qrToken]);
  const people = run.participants ?? [];
  const canReviewResults = !["checkin", "completed", "cancelled"].includes(run.status ?? "");
  const saveResults = () =>
    call(
      `/manager/runs/${run.id}/results`,
      {
        results: people.map((person) => ({
          participantId: person.id,
          result: results[person.id] ?? person.result ?? "participation",
        })),
      },
      refresh,
      setError,
    );
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
                className={styles.runQrImage}
                style={{
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
          <div className={`${styles.actions} ${styles.runControls}`}>
            <button
              className={styles.button}
              onClick={() =>
                void call(
                  `/manager/runs/${run.id}/start`,
                  undefined,
                  refresh,
                  setError,
                )
              }
            >
              <Play size={16} />
              Iniciar jogo
            </button>
            <button
              className={styles.danger}
              onClick={() =>
                void call(
                  `/manager/runs/${run.id}/cancel`,
                  undefined,
                  refresh,
                  setError,
                )
              }
            >
              <Square size={16} /> Cancelar partida
            </button>
          </div>
          <ParticipantList
            people={people}
            results={results}
            onResult={setResults}
            readonly
          />
        </>
      ) : (run.status === "running" || run.status === "paused") && !reviewingResults && canReviewResults ? (
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
                    `/manager/runs/${run.id}/pause`,
                    undefined,
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
                    `/manager/runs/${run.id}/resume`,
                    undefined,
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
                setReviewingResults(true)
              }
            >
              <Trophy size={16} />
              Encerrar e definir pontuação
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
              Confirmar pontuação e encerrar
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
          <li key={person.id} className={readonly ? undefined : styles.participantScored}>
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
              <div className={styles.resultPicker}>
                <span className={styles.resultLabel}>Classificação</span>
                <div className={styles.resultOptions} role="radiogroup" aria-label={`Resultado de ${person.name}`}>
                  {([["first", "1º"], ["second", "2º"], ["third", "3º"], ["participation", "Participante"]] as const).map(([value, label]) => {
                    const selected = (results[person.id] ?? person.result ?? "participation") === value;
                    const takenByOther = value !== "participation" && people.some((other) => other.id !== person.id && (results[other.id] ?? other.result ?? "participation") === value);
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${label}${takenByOther && !selected ? " indisponível" : ""}`}
                        disabled={takenByOther && !selected}
                        className={selected ? styles.resultOptionSelected : styles.resultOption}
                        onClick={() => onResult((current) => {
                          const next = { ...current, [person.id]: value };
                          if (value !== "participation") people.forEach((other) => {
                            if (other.id !== person.id && (next[other.id] ?? other.result ?? "participation") === value) next[other.id] = "participation";
                          });
                          return next;
                        })}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
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
  const [operatingEvent, setOperatingEvent] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          ["draft", "teaser", "active"].includes(event.status ?? "") &&
          (event.status !== "active" ||
            !event.expiresAt ||
            new Date(event.expiresAt).getTime() > nowMs),
      ),
    [events, nowMs],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const releaseQr = useCallback(
    async (event: SpecialEvent) => {
      setOperatingEvent(event.id);
      try {
        await api("/manager/special-events/qr", {
          method: "POST",
          body: JSON.stringify({ eventId: event.id }),
        });
        await refresh();
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setOperatingEvent("");
      }
    },
    [refresh, setError],
  );
  useEffect(() => {
    const teaser = events.find((event) => event.status === "teaser");
    if (!teaser || operatingEvent === teaser.id) return;
    const teaserStartedAt = Date.parse(teaser.qrAvailableAt ?? "");
    const delay = Number.isNaN(teaserStartedAt)
      ? 30_000
      : Math.max(0, teaserStartedAt + 30_000 - Date.now());
    const timer = window.setTimeout(() => void releaseQr(teaser), delay);
    return () => window.clearTimeout(timer);
  }, [events, operatingEvent, releaseQr]);
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
      await api("/manager/special-events", {
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
        ? "/manager/special-events/teaser"
        : event.status === "teaser"
          ? "/manager/special-events/qr"
          : "/manager/special-events/close";
    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify({ eventId: event.id }),
      });
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    }
  }
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
        <form
          className={`${styles.form} ${styles.specialForm}`}
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
      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <div>
            <p className={styles.kicker}>Ao vivo</p>
            <h2>Eventos preparados</h2>
          </div>
        </header>
        {visibleEvents.length ? (
          <ul className={styles.eventList}>
            {visibleEvents.map((event) => (
              <li
                key={event.id}
                className={event.status === "active" ? styles.eventActive : undefined}
              >
                <span className={styles.eventIcon}>
                  <Sparkles size={16} />
                </span>
                <span>
                  <strong>{event.title}</strong>
                  <small>
                    {event.status === "teaser"
                      ? "Teaser em andamento"
                      : event.status === "active"
                        ? `Rodando agora${
                            countdown(event.expiresAt, nowMs)
                              ? ` · termina em ${countdown(event.expiresAt, nowMs)}`
                              : ""
                          }`
                        : "Pronto para iniciar"}
                  </small>
                </span>
                {event.status === "active" ? (
                  <span className={styles.eventActions}>
                    <button onClick={() => void operate(event)}>Encerrar</button>
                  </span>
                ) : event.status === "teaser" ? (
                  <small className={styles.eventStatus}>
                    {operatingEvent === event.id
                      ? "Gerando QR..."
                      : "QR será liberado automaticamente"}
                  </small>
                ) : (
                  <button
                    className={styles.eventActionButton}
                    onClick={() => void operate(event)}
                  >
                    Iniciar teaser
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
