"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, Sparkles, X } from "lucide-react";
import { CONFESSION_FAQ, SPIRITUAL_FAQ } from "@/features/app/fixtures";
import type { AnimDir, QueueType } from "@/features/app/types";
import { pastoralFirestore } from "@/lib/pastoral-queue/firebase";
import { CONFESSION_PREPARATION } from "@/features/queue/confession-preparation";
import {
  getActiveQueue,
  joinQueue,
  leaveQueue,
} from "@/lib/pastoral-queue/participant-service";
import { subscribeQueue } from "@/lib/pastoral-queue/realtime-service";
import type { LiveQueueNotification } from "@/components/live/live-status-stack";
type QueueStage =
  "checking" | "select" | "preparing" | "tracking" | "completed";
const label = (t: QueueType) =>
  t === "confession" ? "Confissão" : "Direção Espiritual";
const preparation = {
  confession: {
    intro: "A Confissão é um encontro com a misericórdia de Deus.",
    steps: [
      "Reserve um momento de silêncio e peça luz ao Espírito Santo.",
      "Faça seu exame de consciência, recordando os pecados desde a última confissão.",
      "Vá com arrependimento sincero e desejo de recomeçar.",
    ],
    note: "Não precisa encontrar palavras perfeitas. Se não souber como começar, diga isso ao padre.",
  },
  spiritual: {
    intro:
      "A Direção Espiritual é um momento de escuta, partilha e discernimento.",
    steps: [
      "Reserve alguns minutos de silêncio para olhar com sinceridade para o que está vivendo.",
      "Escolha aquilo que hoje mais precisa de luz: uma dúvida, decisão, luta ou inquietação.",
      "Vá com liberdade para falar e humildade para escutar.",
    ],
    note: "Direção espiritual não substitui a Confissão. Se perceber que precisa se confessar, procure a fila de Confissão.",
  },
} as const;
export function QueueScreen({
  animDir,
  user = { id: "anonymous", name: "Participante" },
  onQueueNotification,
}: {
  animDir: AnimDir;
  user?: { id: string; name: string };
  onQueueNotification?: (notification: LiveQueueNotification | null) => void;
}) {
  const [type, setType] = useState<QueueType>(null),
    [stage, setStage] = useState<QueueStage>(
      pastoralFirestore ? "checking" : "select",
    ),
    [position, setPosition] = useState<number | null>(null),
    [confirmingExit, setConfirmingExit] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [operation, setOperation] = useState<"enter" | "exit" | null>(null);
  const noticeRef = useRef(""),
    exitingRef = useRef(false),
    joinedThisSessionRef = useRef(false);
  useEffect(() => () => onQueueNotification?.(null), [onQueueNotification]);
  useEffect(() => {
    if (!pastoralFirestore) return;
    let mounted = true;
    void getActiveQueue(pastoralFirestore, user.id)
      .then((entry) => {
        if (!mounted) return;
        if (entry) {
          setType(entry.type);
          setStage("tracking");
        } else setStage("select");
      })
      .catch((cause) => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível consultar sua fila.",
          );
          setStage("select");
        }
      });
    return () => {
      mounted = false;
    };
  }, [user.id]);
  const tracking = stage === "tracking";
  const queueAccent = type === "confession" ? "var(--queue-confession)" : "var(--game)";
  useEffect(() => {
    const db = pastoralFirestore;
    if (!tracking || !type || !db) return;
    let revision = 0;
    let disposed = false;
    const unsubscribe = subscribeQueue(
      type,
      (s) => {
        const currentRevision = ++revision;
        if (exitingRef.current) return;
        const mine = [...s.queued, ...s.calledEntries].find(
          (e) => e.participantId === user.id,
        );
        if (!mine) {
          // A write may reach the client before its first Firestore snapshot. Do not turn that gap into a false completion.
          if (joinedThisSessionRef.current) {
            setPosition(null);
            setStage("tracking");
            return;
          }
          // The waiting and called lists update independently; confirm absence before ending tracking.
          void getActiveQueue(db, user.id)
            .then((active) => {
              if (
                disposed ||
                currentRevision !== revision ||
                exitingRef.current ||
                active
              )
                return;
              setPosition(null);
              onQueueNotification?.(null);
              setStage("completed");
            })
            .catch((cause) => {
              if (!disposed && currentRevision === revision)
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Não foi possível consultar sua fila.",
                );
            });
          return;
        }
        joinedThisSessionRef.current = false;
        const p =
          mine.status === "called"
            ? 0
            : s.queued.findIndex((e) => e.id === mine.id) + 1;
        setPosition(p);
        setStage("tracking");
        const m =
          mine.status === "called"
            ? `Chegou sua hora na fila de ${label(type)}. Dirija-se ao Espaço Esperança — estamos lhe aguardando!`
            : p === 10
              ? "Você está entre os 10 primeiros."
              : p === 5
                ? "Você está entre os 5 primeiros."
                : "";
        if (m && noticeRef.current !== m) {
          noticeRef.current = m;
          onQueueNotification?.({ title: "Atualização da fila", body: m });
        }
      },
      (e) => setError(e.message),
    );
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [onQueueNotification, tracking, type, user.id]);
  const faq = type === "confession" ? CONFESSION_FAQ : SPIRITUAL_FAQ;
  const state =
    position === 0
      ? "Dirija-se ao Espaço Esperança — estamos lhe aguardando!"
      : position !== null && position <= 3
        ? "Sua vez está próxima. Permaneça por perto."
        : "A fila atualiza automaticamente.";
  async function enter(next: "confession" | "spiritual") {
    if (!pastoralFirestore) {
      setError("Fila indisponível neste ambiente.");
      return;
    }
    if (operation) return;
    setOperation("enter");
    try {
      setError("");
      await joinQueue(pastoralFirestore, user, next);
      joinedThisSessionRef.current = true;
      setType(next);
      setStage("tracking");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível entrar na fila.",
      );
    } finally {
      setOperation(null);
    }
  }
  async function exit() {
    if (operation) return;
    exitingRef.current = true;
    setOperation("exit");
    try {
      if (!pastoralFirestore)
        throw new Error("Fila indisponível neste ambiente.");
      await leaveQueue(pastoralFirestore, user.id);
      joinedThisSessionRef.current = false;
      setType(null);
      setPosition(null);
      onQueueNotification?.(null);
      setStage("select");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível sair da fila.",
      );
      setStage("tracking");
    } finally {
      exitingRef.current = false;
      setOperation(null);
      setConfirmingExit(false);
    }
  }
  return (
    <div
      className="absolute inset-0 overflow-y-auto px-5 pb-[calc(var(--bottom-nav-total-height)+1rem)]"
      style={{
        background: "var(--background)",
        paddingTop:
          "calc(var(--participant-header-height) + 8px + var(--safe-area-top))",
        animation:
          animDir === "left" ? "slideInLeft 280ms both" : "fadeUp 220ms both",
      }}
    >
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl p-3 text-sm"
          style={{
            background: "var(--red-alpha-12)",
            color: "var(--secondary)",
          }}
        >
          {error}
        </p>
      )}
      {stage === "checking" && (
        <p className="mt-6 text-sm" role="status">
          Verificando sua fila…
        </p>
      )}
      {stage === "select" && (
        <>
          <h1 className="text-2xl font-black">Fila do Espaço Esperança</h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Escolha seu atendimento.
          </p>
          <div className="mt-5 space-y-4">
            {(["confession", "spiritual"] as const).map((item) => (
              <section
                key={item}
                className="flex items-center gap-4 rounded-3xl p-4"
                style={{
                  background: "var(--card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="grid h-36 w-28 shrink-0 place-items-center">
                  <img
                    src={
                      item === "confession"
                        ? "/images/queue/CRUZ.png"
                        : "/images/queue/MAOS.png"
                    }
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-xl font-black"
                    style={{
                      color:
                        item === "confession"
                          ? "var(--queue-confession)"
                          : "var(--game)",
                    }}
                  >
                    {label(item)}
                  </h2>
                  <p
                    className="mt-2 text-sm leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item === "confession"
                      ? "Tenha a oportunidade de ter o sacramento da reconciliação com um sacerdote!"
                      : "Tenha um diálogo de fé e confiança sobre sua vida e discernimento à luz de Deus!"}
                  </p>
                  <button
                    aria-label={`Preparar para ${label(item)}`}
                    className="mt-4 w-full rounded-full py-3 text-sm font-bold text-white"
                    style={{
                      background:
                        item === "confession"
                          ? "var(--queue-confession)"
                          : "var(--game)",
                    }}
                    onClick={() => {
                      setType(item);
                      setReady(false);
                      setStage("preparing");
                    }}
                  >
                    Entrar na fila
                  </button>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      {stage === "preparing" && type && (
        <section className="mt-0">
          <button
            className="text-sm font-bold"
            onClick={() => {
              setType(null);
              setStage("select");
            }}
          >
            ← Voltar às filas
          </button>
          <div
            className="mt-4 rounded-2xl p-5"
            style={{
              background: "var(--card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <Sparkles
                size={24}
                color={
                  type === "confession"
                    ? "var(--queue-confession)"
                    : "var(--game)"
                }
              />
              <h1
                className="text-2xl font-black"
                style={{
                  color:
                    type === "confession"
                      ? "var(--queue-confession)"
                      : "var(--game)",
                }}
              >
                {label(type)}
              </h1>
            </div>
            <h2
              className="mt-2 text-left text-lg font-black"
            >Antes de entrar</h2>
            <p
              className="mt-3 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {preparation[type].intro}
            </p>
            <ol className="mt-5 space-y-4">
              {preparation[type].steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full font-bold"
                    style={{
                      background:
                        type === "confession"
                          ? "color-mix(in srgb, var(--queue-confession) 15%, transparent)"
                          : "var(--accent-alpha-15)",
                      color:
                        type === "confession"
                          ? "var(--queue-confession)"
                          : "var(--game)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p
              className="mt-5 rounded-xl p-3 text-sm"
              style={{ background: "var(--muted)" }}
            >
              {preparation[type].note}
            </p>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={ready}
                onChange={(event) => setReady(event.target.checked)}
                className="mt-1 size-4"
              />
              <span>Li a preparação e quero entrar nesta fila.</span>
            </label>
            <button
              disabled={!ready || operation === "enter"}
              className="mt-5 w-full rounded-xl py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  type === "confession"
                    ? "var(--queue-confession)"
                    : "var(--game)",
              }}
              onClick={() => void enter(type)}
            >
              {operation === "enter"
                ? "Entrando na fila…"
                : `Entrar na fila de ${label(type)}`}
            </button>
          </div>
        </section>
      )}
      {stage === "completed" && type && (
        <section
          className="mt-16 rounded-3xl p-6 text-center"
          style={{ background: "var(--card)" }}
        >
          <CheckCircle2 className="mx-auto" size={48} />
          <h1 className="mt-5 text-xl font-black">Atendimento encerrado</h1>
          <p className="mt-3 text-sm">
            Seu acompanhamento de {label(type)} foi finalizado.
          </p>
          <button
            className="mt-6 w-full rounded-2xl py-3 font-bold text-white"
            style={{ background: "var(--game)" }}
            onClick={() => {
              setType(null);
              setStage("select");
            }}
          >
            Voltar às filas
          </button>
        </section>
      )}
      {stage === "tracking" && type && position === null && (
        <p className="mt-6 text-sm" role="status">
          Atualizando sua posição na fila…
        </p>
      )}
      {stage === "tracking" && type && position !== null && (
        <>
          <header>
            <button
              className="float-right rounded-full p-2 transition-opacity hover:opacity-70"
              onClick={() => setConfirmingExit(true)}
              aria-label="Sair da fila"
              title="Sair da fila"
            >
              <X />
            </button>
            <h1 className="text-2xl font-black">{label(type)}</h1>
          </header>
          <section
            className="mt-4 rounded-3xl p-4 text-center text-white"
            style={{
              background: queueAccent,
            }}
          >
            <span className="text-sm text-white/80">
              {position === 0
                ? "Chamado para atendimento"
                : "Sua posição na fila"}
            </span>
            <strong className="mt-1 block text-4xl">
              {position === 0 ? "Sua vez!" : `${position}º`}
            </strong>
            <p className="mt-3 flex items-center justify-center gap-2 text-sm">
              <Clock3 size={17} />
              {state}
            </p>
          </section>
          <p className="mt-2 text-center text-xs">Atualizado em tempo real.</p>
          {confirmingExit && (
            <div
              role="dialog"
              aria-label="Confirmar saída da fila"
              aria-modal="true"
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4"
            >
              <section className="w-full max-w-md rounded-3xl p-5" style={{ background: "var(--card)" }}>
                <p className="text-lg font-black" style={{ color: queueAccent }}>Sair da fila?</p>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Você perderá sua posição atual e precisará entrar novamente se quiser continuar aguardando.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  disabled={operation === "exit"}
                  className="rounded-xl py-3 text-sm font-bold"
                  style={{ background: "var(--muted)", color: "var(--foreground)" }}
                  onClick={() => setConfirmingExit(false)}
                >
                  Cancelar
                </button>
                <button
                  disabled={operation === "exit"}
                  className="rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: queueAccent }}
                  onClick={() => void exit()}
                >
                  {operation === "exit" ? "Saindo…" : "Confirmar saída"}
                </button>
                </div>
              </section>
            </div>
          )}
          <section className="mt-6">
            <h2 className="text-lg font-black">
              {type === "confession" ? "Preparação para a Confissão" : "Preparação para Direção Espiritual"}
            </h2>
            {type === "confession" ? (
              <div className="mt-3 space-y-2">
                {CONFESSION_PREPARATION.map((section) => (
                  <details key={section.title} className="overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                    <summary className="cursor-pointer px-4 py-4 text-sm font-black" style={{ color: queueAccent }}>
                      {section.title}
                    </summary>
                    <div className="max-w-prose space-y-4 border-t px-4 py-4 text-sm leading-7" style={{ borderColor: "var(--border)" }}>
                      {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      {section.items && (section.itemHeadingIndexes ? (
                        <div className="space-y-3">
                          {section.items.map((item, itemIndex) => section.itemHeadingIndexes?.includes(itemIndex) ? (
                            <p key={item} className="pt-2 font-black" style={{ color: queueAccent }}>{item}</p>
                          ) : (
                            <p key={item} className="pl-4 before:mr-2 before:content-['•']">{item}</p>
                          ))}
                        </div>
                      ) : (
                        <ol className="list-decimal space-y-2 pl-5">{section.items.map((item) => <li key={item}>{item}</li>)}</ol>
                      ))}
                      {section.afterItems?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
                {faq.slice(0, 4).map((i) => (
                  <details key={i.q} className="border-b p-4">
                    <summary className="cursor-pointer text-sm font-bold">{i.q}</summary>
                    <p className="mt-3 text-sm">{i.a}</p>
                  </details>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
