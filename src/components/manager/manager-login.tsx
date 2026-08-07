"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./manager-dashboard.module.css";

export function ManagerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => { void fetch("/api/manager/session", { cache: "no-store" }).then((response) => response.ok && router.replace("/manager")); }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try { const response = await fetch("/api/manager/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); if (!response.ok) { setError("E-mail ou senha incorretos. Confira suas credenciais."); return; } router.replace("/manager"); } catch { setError("Não foi possível conectar. Confira sua rede e tente novamente."); } finally { setPending(false); }
  }
  return <main className={styles.login}><form className={styles.loginCard} onSubmit={submit}><div className={styles.loginMark}>DNJ</div><h1>Operação DNJ</h1><p>Entre com sua conta de gestor. Sua área de trabalho é definida pelas permissões da conta.</p><label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></label><label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{error ? <span role="alert" className={styles.error}>{error}</span> : null}<button className={styles.button} disabled={pending} type="submit"><LockKeyhole size={17} />{pending ? "Entrando…" : "Entrar na operação"}</button><p className={styles.loginHelp}>Use as credenciais atribuídas pela administração do DNJ.</p></form></main>;
}
