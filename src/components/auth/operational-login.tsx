"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { env } from "@/lib/env";
import type { ApiUserRole } from "@/lib/api/roles";

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

  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20, background: "#f4f8f2", color: "#13342b" }}>
    <form onSubmit={submit} style={{ width: "min(100%, 400px)", display: "grid", gap: 14, borderRadius: 20, padding: 28, background: "#fff", boxShadow: "0 22px 56px rgba(7,31,23,.18)" }}>
      <strong style={{ fontSize: 24 }}>{area}</strong>
      <p style={{ margin: 0, color: "#5f7d70" }}>Entre com e-mail ou Google. O acesso é liberado pelas permissões da sua conta.</p>
      <label style={{ display: "grid", gap: 6 }}>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required disabled={codeSent} /></label>
      {codeSent && <label style={{ display: "grid", gap: 6 }}>Código de 6 dígitos<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required /></label>}
      {error && <p role="alert" style={{ color: "#b33d24", margin: 0 }}>{error}</p>}
      <button disabled={pending || !email || (codeSent && code.length !== 6)} type="submit">{pending ? "Entrando…" : codeSent ? "Confirmar código" : "Enviar código"}</button>
      <div ref={googleButton} style={{ justifySelf: "center" }} aria-label="Entrar com Google" />
    </form>
  </main>;
}
