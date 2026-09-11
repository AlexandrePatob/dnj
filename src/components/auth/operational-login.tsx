"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/lib/auth-storage";
import { env } from "@/lib/env";
import type { ApiUserRole } from "@/lib/api/roles";
import styles from "./operational-login.module.css";

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (parent: HTMLElement, options: Record<string, string>) => void } } };
  }
}

type Props = { area: string; role: ApiUserRole; destination: string };
const showEmailDebugCode = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_EMAIL_DEBUG_CODE === "true";

export function OperationalLogin({ area, role, destination }: Props) {
  const router = useRouter();
  const googleButton = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [homologationCode, setHomologationCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // The API client already persisted the token pair; only the role gate is
  // local. A wrong role must not leave usable operational credentials behind.
  const finish = useCallback(async (returnedRole: ApiUserRole) => {
    if (returnedRole !== role) { await authApi.logout(); authStorage.clearCredentials(); throw new Error("Esta conta não tem acesso a esta área."); }
    router.replace(destination);
  }, [destination, role, router]);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setPending(true); setError("");
    try { const identity = await authApi.loginWithGoogle(idToken); await finish(identity.user.role); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível entrar."); }
    finally { setPending(false); }
  }, [finish]);

  useEffect(() => {
    if (!authStorage.hasSession()) return;
    let active = true;
    void authApi.getSession().then((identity) => { if (active && identity.user.role === role) router.replace(destination); }).catch(() => undefined);
    return () => { active = false; };
  }, [destination, role, router]);

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
      if (!codeSent) {
        const response = await authApi.requestCode(email);
        setHomologationCode(showEmailDebugCode ? response.debugCode ?? "" : "");
        setCodeSent(true);
        return;
      }
      const identity = await authApi.verifyCode(email, code); await finish(identity.user.role);
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
      {homologationCode && <p role="status" className={styles.hint}>Código local: <strong>{homologationCode}</strong></p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.button} disabled={pending || !email || (codeSent && code.length !== 6)} type="submit">{pending ? "Entrando…" : codeSent ? "Confirmar código" : "Enviar código"}</button>
      <div ref={googleButton} className={styles.google} aria-label="Entrar com Google" />
      <p className={styles.hint}>Acesso restrito à equipe autorizada do DNJ.</p>
    </form>
  </main>;
}
