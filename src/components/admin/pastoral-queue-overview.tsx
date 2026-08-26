"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { pastoralFirestore } from "@/lib/pastoral-queue/firebase";
import styles from "./admin-dashboard.module.css";

type QueueType = "confession" | "spiritual";
type QueueEntry = {
  participantName?: string;
  type?: QueueType;
  status?: "queued" | "called" | "completed" | "no_show" | "cancelled";
  createdAt?: { toMillis?: () => number } | string;
};

function subscribeToEntries(onChange: (entries: QueueEntry[]) => void, onError: () => void) {
  if (!pastoralFirestore) {
    onError();
    return () => undefined;
  }
  return onSnapshot(
    collection(pastoralFirestore, "pastoral_queue", "current", "entries"),
    (snapshot) => onChange(snapshot.docs.map((doc) => doc.data() as QueueEntry)),
    onError,
  );
}

export function PastoralQueueOverview() {
  const [entries, setEntries] = useState<QueueEntry[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => subscribeToEntries(setEntries, () => setError(true)), []);
  const queues = useMemo(() => {
    const result = new Map<QueueType, QueueEntry[]>();
    for (const type of ["confession", "spiritual"] as const) {
      result.set(type, (entries ?? [])
        .filter((entry) => entry.type === type && ["queued", "called"].includes(entry.status ?? ""))
        .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt)));
    }
    return result;
  }, [entries]);
  if (error) return <section className={styles.placeholder}><h2>Filas indisponíveis</h2><p>Não foi possível acompanhar o estado das filas pastorais.</p></section>;
  if (!entries) return <section className={styles.placeholder}><p>Carregando filas pastorais…</p></section>;
  return <div className={styles.dashboard}>
    <p className={styles.help}>Acompanhamento somente leitura em tempo real.</p>
    <div className={styles.columns}>
      <QueueCard title="Confissão" entries={queues.get("confession") ?? []} />
      <QueueCard title="Direção espiritual" entries={queues.get("spiritual") ?? []} />
    </div>
  </div>;
}

function QueueCard({ title, entries }: { title: string; entries: QueueEntry[] }) {
  const called = entries.find((entry) => entry.status === "called");
  const queued = entries.filter((entry) => entry.status === "queued");
  return <section className={styles.activity}>
    <div className={styles.sectionTitle}><div><p>Fila pastoral</p><h2>{title}</h2></div><strong>{queued.length} aguardando</strong></div>
    <p className={styles.help}>{called ? `Atualmente chamado: ${called.participantName ?? "Participante"}` : "Ninguém chamado no momento."}</p>
    {queued.length ? <ol>{queued.slice(0, 3).map((entry, index) => <li key={`${entry.participantName ?? "entry"}-${index}`}><span className={styles.activityDot} /><div><strong>{index + 1}. {entry.participantName ?? "Participante"}</strong><p>Na fila</p></div></li>)}</ol> : <p className={styles.empty}>Nenhuma pessoa aguardando.</p>}
  </section>;
}

function timestamp(value: QueueEntry["createdAt"]) {
  if (typeof value === "string") return new Date(value).getTime();
  return value?.toMillis?.() ?? 0;
}
