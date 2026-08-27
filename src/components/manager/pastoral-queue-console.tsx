"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, Heart, UsersRound } from "lucide-react";
import { pastoralFirestore } from "@/lib/pastoral-queue/firebase";
import { getQueueConfig, subscribeToQueueConfig, updateQueueConfig } from "@/lib/pastoral-queue/config-service";
import { subscribeQueue, subscribeQueueHistory, type QueueHistoryStats } from "@/lib/pastoral-queue/realtime-service";
import type { PastoralQueueType, QueueConfig, QueueEntry } from "@/lib/pastoral-queue/types";
import { callNext as callNextAtomic, resolveCalled } from "@/lib/pastoral-queue/manager-service";
import styles from "./manager-dashboard.module.css";

const types = ["confession", "spiritual"] as const;
const label: Record<PastoralQueueType, string> = { confession: "Confissões", spiritual: "Direção Espiritual" };
const emptyHistory: QueueHistoryStats = { totalCalled: 0, completed: 0, noShows: 0 };

export function PastoralQueueConsole() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<Record<PastoralQueueType, QueueHistoryStats>>({ confession: emptyHistory, spiritual: emptyHistory });
  const [now, setNow] = useState(() => Date.now());
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [error, setError] = useState(() => pastoralFirestore ? "" : "Firestore pastoral indisponível.");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    if (!pastoralFirestore) return () => window.clearInterval(timer);
    const replaceType = (type: PastoralQueueType, snapshot: { queued: QueueEntry[]; called: QueueEntry | null }) => setEntries((current) => [
      ...current.filter((entry) => entry.type !== type),
      ...snapshot.queued,
      ...(snapshot.called ? [snapshot.called] : []),
    ]);
    const subscriptions = types.flatMap((type) => [
      subscribeQueue(type, (snapshot) => replaceType(type, snapshot), () => setError("Não foi possível acompanhar as filas.")),
      subscribeQueueHistory(type, (stats) => setHistory((current) => ({ ...current, [type]: stats })), () => setError("Não foi possível carregar o histórico das filas.")),
    ]);
    const unsubscribeConfig = subscribeToQueueConfig(setConfig, () => setError("Não foi possível carregar a configuração."));
    return () => { window.clearInterval(timer); subscriptions.forEach((unsubscribe) => unsubscribe()); unsubscribeConfig(); };
  }, []);

  const queues = useMemo(() => Object.fromEntries(types.map((type) => [type, entries.filter((entry) => entry.type === type)])) as Record<PastoralQueueType, QueueEntry[]>, [entries]);
  async function callNext(type: PastoralQueueType) {
    if (!pastoralFirestore) return;
    try { await callNextAtomic(pastoralFirestore, type, { id: "manager", name: "Gestor" }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível chamar a próxima pessoa."); }
  }
  async function resolve(entry: QueueEntry, status: "completed" | "no_show") {
    if (!pastoralFirestore) return;
    try { await resolveCalled(pastoralFirestore, entry.id, status, { id: "manager", name: "Gestor" }); } catch { setError("Não foi possível encerrar a chamada."); }
  }
  async function toggleOpen() {
    try { const current = config ?? await getQueueConfig(); setConfig(await updateQueueConfig({ isQueueOpen: !current.isQueueOpen })); }
    catch { setError("Não foi possível alterar a abertura das filas."); }
  }

  if (error && !config) return <section className={styles.placeholder}><h2>Filas indisponíveis</h2><p>{error}</p></section>;
  return <section className={styles.queueConsole}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <header className={styles.queueToolbar}>
      <div><p className={styles.kicker}>Configuração global</p><strong>{config?.isQueueOpen ? "Filas abertas" : "Filas fechadas"}</strong><span>{config?.isQueueOpen ? "Novas entradas liberadas" : "Novas entradas bloqueadas"}</span></div>
      <button className={config?.isQueueOpen ? styles.danger : styles.button} onClick={() => void toggleOpen()}>{config?.isQueueOpen ? "Fechar filas" : "Abrir filas"}</button>
    </header>
    <div className={styles.queueGrid}>{types.map((type) => <QueuePanel key={type} type={type} entries={queues[type]} history={history[type]} now={now} onCallNext={callNext} onResolve={resolve} />)}</div>
  </section>;
}

function QueuePanel({ type, entries, history, now, onCallNext, onResolve }: { type: PastoralQueueType; entries: QueueEntry[]; history: QueueHistoryStats; now: number; onCallNext: (type: PastoralQueueType) => void; onResolve: (entry: QueueEntry, status: "completed" | "no_show") => void }) {
  const called = entries.find((entry) => entry.status === "called");
  const queued = entries.filter((entry) => entry.status === "queued");
  const Icon = type === "confession" ? Heart : UsersRound;
  const overdue = Boolean(called?.calledAt && now - called.calledAt.toMillis() >= 120_000);
  return <section className={`${styles.queuePanel} ${type === "confession" ? styles.confession : styles.spiritual}`}>
    <header className={styles.queuePanelHeader}><div><Icon aria-hidden="true" size={25} /><h2>{label[type]}</h2></div><button className={styles.callButton} onClick={() => void onCallNext(type)} disabled={!queued.length}><BellRing size={16} />Chamar próxima</button></header>
    <dl className={styles.queueMetrics}><div><dt>Na fila</dt><dd>{queued.length}</dd></div><div><dt>Chamados</dt><dd>{history.totalCalled}</dd></div><div><dt>Atendidos</dt><dd>{history.completed}</dd></div></dl>
    <section className={styles.calledArea} aria-label={`Pessoa chamada em ${label[type]}`}>
      {called ? <><div><span>Chamada agora</span><strong>{called.participantName}</strong><small>{overdue ? "Atenção: passou de 2 minutos" : "Aguardando confirmação"}</small></div><div className={styles.calledActions}><button className={styles.secondary} onClick={() => void onResolve(called, "completed")}><CheckCircle2 size={16} />Atendido</button><button className={styles.danger} onClick={() => void onResolve(called, "no_show")}>Não compareceu</button></div></> : <p>Ninguém chamado no momento.</p>}
    </section>
    <ol className={styles.queueList} aria-label={`Participantes aguardando em ${label[type]}`}>
      {queued.map((entry, index) => <li key={entry.id}><span className={styles.position}>{index + 1}º</span><strong>{entry.participantName}</strong><small>Aguardando atendimento</small></li>)}
      {!queued.length && <li className={styles.queueEmpty}>Ninguém na fila.</li>}
    </ol>
  </section>;
}
