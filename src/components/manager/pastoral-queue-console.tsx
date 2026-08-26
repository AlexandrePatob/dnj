"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, onSnapshot, runTransaction } from "firebase/firestore";
import { pastoralFirestore } from "@/lib/pastoral-queue/firebase";
import { getQueueConfig, subscribeToQueueConfig, updateQueueConfig } from "@/lib/pastoral-queue/config-service";
import type { PastoralQueueType, QueueConfig, QueueEntry } from "@/lib/pastoral-queue/types";
import styles from "./manager-dashboard.module.css";

const path = ["pastoral_queue", "current", "entries"] as const;
const label: Record<PastoralQueueType, string> = { confession: "Confissão", spiritual: "Direção espiritual" };

export function PastoralQueueConsole() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [error, setError] = useState(() => pastoralFirestore ? "" : "Firestore pastoral indisponível.");
  useEffect(() => {
    if (!pastoralFirestore) return;
    const firestore = pastoralFirestore;
    const ref = collection(firestore, ...path);
    const unsubscribeEntries = onSnapshot(ref, (snapshot) => setEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as QueueEntry)), () => setError("Não foi possível acompanhar as filas."));
    const unsubscribeConfig = subscribeToQueueConfig(setConfig, () => setError("Não foi possível carregar a configuração."));
    return () => { unsubscribeEntries(); unsubscribeConfig(); };
  }, []);
  const queueEntries = useMemo(() => ({ confession: entries.filter((entry) => entry.type === "confession" && ["queued", "called"].includes(entry.status)), spiritual: entries.filter((entry) => entry.type === "spiritual" && ["queued", "called"].includes(entry.status)) }), [entries]);
  async function callNext(type: PastoralQueueType) {
    if (!pastoralFirestore) return;
    const firestore = pastoralFirestore;
    try {
      const snapshot = await getDocs(collection(pastoralFirestore, ...path));
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as QueueEntry).filter((entry) => entry.type === type && entry.status === "queued").sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())[0];
      if (!next) return;
      await runTransaction(firestore, async (transaction) => { transaction.update(doc(firestore, ...path, next.id), { status: "called", calledAt: new Date() }); });
    } catch { setError("Não foi possível chamar a próxima pessoa."); }
  }
  async function resolve(entry: QueueEntry, status: "completed" | "no_show") {
    if (!pastoralFirestore) return;
    try { const firestore = pastoralFirestore; if (!firestore) return; await runTransaction(firestore, async (transaction) => { transaction.update(doc(firestore, ...path, entry.id), { status, resolvedAt: new Date() }); }); } catch { setError("Não foi possível resolver o atendimento."); }
  }
  async function toggleOpen() { const current = config ?? await getQueueConfig(); await updateQueueConfig({ isQueueOpen: !current.isQueueOpen }).then(setConfig).catch(() => setError("Não foi possível alterar a abertura das filas.")); }
  if (error && !config) return <section className={styles.placeholder}><h2>Filas indisponíveis</h2><p>{error}</p></section>;
  return <div className={styles.stack}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <section className={styles.panel}><header className={styles.panelHeader}><div><p className={styles.kicker}>Configuração global</p><h2>Filas pastorais</h2></div><button className={config?.isQueueOpen ? styles.danger : styles.button} onClick={() => void toggleOpen()}>{config?.isQueueOpen ? "Fechar filas" : "Abrir filas"}</button></header><p>Confissão e Direção espiritual abrem e fecham juntas. Marcos de aviso: 10, 5 e sua vez.</p></section>
    <div className={styles.columns}>{(["confession", "spiritual"] as const).map((type) => <section className={styles.panel} key={type}><header className={styles.panelHeader}><div><p className={styles.kicker}>Operação</p><h2>{label[type]}</h2></div><span className={styles.scope}>{queueEntries[type].filter((entry) => entry.status === "queued").length} aguardando</span></header><button className={styles.button} onClick={() => void callNext(type)}>Chamar próxima</button>{queueEntries[type].map((entry) => <article className={styles.queueItem} key={entry.id}><strong>{entry.participantName}</strong><span>{entry.status === "called" ? "Aguardando confirmação (2 min)" : "Na fila"}</span>{entry.status === "called" ? <div className={styles.actions}><button className={styles.button} onClick={() => void resolve(entry, "completed")}>Confirmar atendimento</button><button className={styles.danger} onClick={() => void resolve(entry, "no_show")}>Não compareceu</button></div> : null}</article>)}</section>)}</div>
  </div>;
}
