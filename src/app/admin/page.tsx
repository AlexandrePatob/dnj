"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { authApi } from "@/lib/api/auth";
import { authStorage } from "@/lib/auth-storage";
import type { AdminSession } from "@/types/admin";

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    // The external API restores the session from the stored bearer token
    // (refreshing it once if expired) and is the only authority on the role.
    const restore = async () => {
      if (!authStorage.getAccessToken()) { setSession(null); return; }
      const identity = await authApi.getSession();
      if (!active) return;
      if (identity.user.role !== "ADMIN" || !identity.user.email) { authStorage.clearCredentials(); setSession(null); return; }
      setSession({ email: identity.user.email, name: identity.user.name || "Administração DNJ" });
    };
    void restore().catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/admin/login");
  }, [router, session]);

  if (!session) return <main aria-label="Verificando acesso administrativo" />;
  return <AdminDashboard session={session} onExit={() => router.replace("/admin/login")} />;
}
