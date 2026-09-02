"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { currentPushSetupState, disablePushNotifications, enablePushNotifications, pushSetupState, type PushSetupState } from "@/lib/pwa/push-notifications";

const labels: Record<PushSetupState, string> = {
  unsupported: "Este navegador não oferece alertas push.",
  "not-asked": "Receba sua vez na fila, desafios e avisos importantes.",
  denied: "As notificações estão bloqueadas no navegador.",
  ready: "Os alertas estão prontos para serem ativados.",
  subscribed: "Alertas deste dispositivo estão ativos.",
  error: "Não foi possível configurar agora. Tente novamente.",
};

export function PushNotificationSettings({ prompt = false, onDone }: { prompt?: boolean; onDone?: () => void }) {
  const [state, setState] = useState<PushSetupState>(() => pushSetupState());
  const [pending, setPending] = useState(false);
  useEffect(() => { let active = true; void currentPushSetupState().then((next) => { if (active) setState(next); }); return () => { active = false; }; }, []);
  const enable = async () => { setPending(true); setState(await enablePushNotifications()); setPending(false); onDone?.(); };
  const disable = async () => { setPending(true); setState(await disablePushNotifications()); setPending(false); };
  const canEnable = state === "not-asked" || state === "ready" || state === "error";
  if (prompt && !canEnable) return null;
  return <section className={prompt ? "mx-5 rounded-2xl border p-4" : "flex gap-3 border-t px-4 py-4"} style={{ background: prompt ? "var(--card)" : undefined, borderColor: "var(--border)" }} aria-label="Alertas importantes">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--primary-alpha-10)", color: "var(--primary)" }}><Bell size={18} /></span>
    <div className="min-w-0 flex-1 text-sm"><strong className="block">Alertas importantes</strong><span className="mt-1 block text-xs" style={{ color: "var(--muted-foreground)" }}>{labels[state]}</span>{prompt ? <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Inclui chamada da fila, desafios, eventos e avisos urgentes. Pontos e atividades normais não interrompem você.</p> : null}</div>
    {state === "subscribed" ? <button type="button" disabled={pending} onClick={() => void disable()} className="self-center rounded-xl px-3 py-2 text-xs font-bold" style={{ color: "var(--secondary)" }}><BellOff size={15} className="mr-1 inline" />Desativar</button> : canEnable ? <button type="button" disabled={pending} onClick={() => void enable()} className="self-center rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>{pending ? "Ativando…" : "Ativar"}</button> : null}
  </section>;
}
