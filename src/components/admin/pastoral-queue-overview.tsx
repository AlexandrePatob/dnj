"use client";

import { useEffect, useMemo, useState } from "react";
import { getQueueConfig, subscribeToQueueConfig, updateQueueConfig } from "@/lib/pastoral-queue/config-service";
import { subscribeQueue } from "@/lib/pastoral-queue/realtime-service";
import type { QueueConfig } from "@/lib/pastoral-queue/types";
import styles from "./admin-dashboard.module.css";

type QueueType = "confession" | "spiritual";
type QueueEntry = {
  participantName?: string;
  type?: QueueType;
  status?: "queued" | "called" | "completed" | "no_show" | "cancelled";
  createdAt?: { toMillis?: () => number } | string;
  calledAt?: { toMillis?: () => number } | string;
};

export function PastoralQueueOverview() {
  const [entries, setEntries] = useState<QueueEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [config, setConfig] = useState<QueueConfig | null>(null);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const replaceType = (type: QueueType, snapshot: { queued: QueueEntry[]; calledEntries: QueueEntry[] }) => setEntries((current) => [
      ...(current ?? []).filter((entry) => entry.type !== type),
      ...snapshot.queued,
      ...snapshot.calledEntries,
    ]);
    const confession = subscribeQueue("confession", (snapshot) => replaceType("confession", snapshot), () => setError(true));
    const spiritual = subscribeQueue("spiritual", (snapshot) => replaceType("spiritual", snapshot), () => setError(true));
    return () => { confession(); spiritual(); };
  }, []);
  useEffect(() => subscribeToQueueConfig(setConfig, () => setError(true)), []);
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
  async function toggleQueue() {
    setUpdating(true);
    try {
      const current = config ?? await getQueueConfig();
      setConfig(await updateQueueConfig({ isQueueOpen: !current.isQueueOpen }));
    } catch {
      setError(true);
    } finally {
      setUpdating(false);
    }
  }
  return <div className={styles.dashboard}>
    <section className={styles.attention} aria-live="polite">
      <div className={styles.sectionTitle}><div><p>Operação da fila</p><h2>{config?.isQueueOpen ? "Filas abertas" : "Filas fechadas"}</h2></div><button className={config?.isQueueOpen ? styles.dangerButton : styles.primaryButton} disabled={!config || updating} onClick={() => void toggleQueue()}>{updating ? "Atualizando…" : config?.isQueueOpen ? "Fechar filas" : "Abrir filas"}</button></div>
      <p>{config?.isQueueOpen ? "Participantes podem entrar nas filas de Confissão e Direção Espiritual." : "Novas entradas estão bloqueadas; quem já aguarda permanece na fila."}</p>
    </section>
    <div className={styles.columns}>
      <QueueCard title="Confissão" entries={queues.get("confession") ?? []} />
      <QueueCard title="Direção espiritual" entries={queues.get("spiritual") ?? []} />
    </div>
  </div>;
}

function QueueCard({ title, entries }: { title: string; entries: QueueEntry[] }) {
  const called = entries.filter((entry) => entry.status === "called");
  const queued = entries.filter((entry) => entry.status === "queued");
  return <section className={styles.activity}>
    <div className={styles.sectionTitle}><div><p>Fila pastoral</p><h2>{title}</h2></div><strong>{queued.length} aguardando</strong></div>
    <p className={styles.help}>{called.length ? `${called.length} chamado${called.length > 1 ? "s" : ""} para encaminhar.` : "Ninguém chamado no momento."}</p>
    {called.length > 0 && <div className={styles.calledPeople} aria-label={`Chamados em ${title}`}><p>Chamados agora</p><ol>{called.map((entry, index) => <li key={`${entry.participantName ?? "entry"}-${index}`}><span className={styles.calledDot} /><div><strong>{entry.participantName ?? "Participante"}</strong><p>Encaminhar para {title}{entry.calledAt || entry.createdAt ? ` · ${calledTime(entry.calledAt ?? entry.createdAt)}` : ""}</p></div></li>)}</ol></div>}
    {queued.length ? <ol>{queued.slice(0, 3).map((entry, index) => <li key={`${entry.participantName ?? "entry"}-${index}`}><span className={styles.activityDot} /><div><strong>{index + 1}. {entry.participantName ?? "Participante"}</strong><p>Na fila</p></div></li>)}</ol> : <p className={styles.empty}>Nenhuma pessoa aguardando.</p>}
  </section>;
}

function calledTime(value: QueueEntry["calledAt"]) {
  const date = typeof value === "string" ? new Date(value) : value?.toMillis ? new Date(value.toMillis()) : null;
  return date && !Number.isNaN(date.getTime()) ? `chamado às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "chamado agora";
}

function timestamp(value: QueueEntry["createdAt"]) {
  if (typeof value === "string") return new Date(value).getTime();
  return value?.toMillis?.() ?? 0;
}
