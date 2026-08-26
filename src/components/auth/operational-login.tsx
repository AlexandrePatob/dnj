"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { env } from "@/lib/env";
import type { ApiUserRole } from "@/lib/api/roles";
import styles from "./operational-login.module.css";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (parent: HTMLElement, options: Record<string, string>) => void } } };
  }
}

type Props = { area: string; role: ApiUserRole; sessionPath: string; destination: string };

export function OperationalLogin({ area, role, sessionPath, destination }: Props) {
  const router = useRouter();
  const googleButton = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const finish = useCallback(async (accessToken: string, returnedRole: ApiUserRole) => {
    if (returnedRole !== role) throw new Error("Esta conta não tem acesso a esta área.");
    const response = await fetch(sessionPath.replace(/^\/api\/admin/, "/api/v2/admin"), { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken }) });
    if (!response.ok) throw new Error("Não foi possível liberar o acesso a esta área.");
    router.replace(destination);
  }, [destination, role, router, sessionPath]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setPending(true); setError("");
    try { const identity = await authApi.loginWithGoogle(idToken); await finish(identity.accessToken, identity.user.role); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setPending(false); }
  }, [finish]);

  useEffect(() => {
    if (!env.googleClientId || !googleButton.current) return;
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({ client_id: env.googleClientId, callback: ({ credential }) => void signInWithGoogle(credential) });
      googleButton.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButton.current, { type: "standard", theme: "outline", size: "large", width: "340" });
    };
    if (window.google) { render(); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.onload = render; document.head.appendChild(script);
    return () => script.remove();
  }, [signInWithGoogle]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      if (!codeSent) { await authApi.requestCode(email); setCodeSent(true); return; }
      const identity = await authApi.verifyCode(email, code); await finish(identity.accessToken, identity.user.role);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setPending(false); }
  }

  return <main className={styles.page}>
    <form className={styles.card} onSubmit={submit}>
      <div className={styles.brand}><span className={styles.mark}>DNJ</span><p className={styles.eyebrow}>{area}</p></div>
      <h1 className={styles.title}>Acesso à operação</h1>
      <p className={styles.description}>Entre com e-mail ou Google. O acesso é liberado pelas permissões da sua conta.</p>
      <label className={styles.field}>E-mail<input className={styles.input} value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required disabled={codeSent} /></label>
      {codeSent && <label className={styles.field}>Código de 6 dígitos<input className={styles.input} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required /></label>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.button} disabled={pending || !email || (codeSent && code.length !== 6)} type="submit">{pending ? "Entrando…" : codeSent ? "Confirmar código" : "Enviar código"}</button>
      <div ref={googleButton} className={styles.google} aria-label="Entrar com Google" />
      <p className={styles.hint}>Acesso restrito à equipe autorizada do DNJ.</p>
    </form>
  </main>;
}
