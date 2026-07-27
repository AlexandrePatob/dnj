"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import styles from "@/components/admin/admin-dashboard.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void fetch("/api/admin/session").then((response) => { if (response.ok) router.replace("/admin"); }); }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!response.ok) { setError("E-mail ou senha incorretos. Tente novamente."); return; }
    router.replace("/admin");
  }
  return <main className={styles.shell} style={{ gridTemplateColumns: "1fr", placeItems: "center", padding: 20 }}>
    <form onSubmit={submit} className={styles.activity} style={{ width: "min(100%, 420px)", padding: 30, display: "grid", gap: 18 }}>
      <span className={styles.avatar} style={{ width: 44, height: 44 }}><ShieldCheck size={23} /></span>
      <div><p className={styles.context}>ÁREA RESTRITA</p><h1 style={{ margin: 0 }}>Central DNJ</h1><p style={{ color: "#66827b", lineHeight: 1.55 }}>Entre com suas credenciais administrativas para operar o evento.</p></div>
      <label style={{ display: "grid", gap: 6 }}>E-mail<input autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ border: "1px solid #cbd8d3", borderRadius: 9, padding: 11 }} /></label>
      <label style={{ display: "grid", gap: 6 }}>Senha<input autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ border: "1px solid #cbd8d3", borderRadius: 9, padding: 11 }} /></label>
      {error && <p role="alert" style={{ color: "#b33d24", margin: 0, fontSize: ".82rem" }}>{error}</p>}
      <button type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 9, padding: 12, background: "#e87425", color: "white", cursor: "pointer" }}><LockKeyhole size={17} /> Entrar na central</button>
      <p style={{ margin: 0, fontSize: ".7rem", color: "#66827b" }}>Use as credenciais administrativas configuradas no ambiente.</p>
    </form>
  </main>;
}
