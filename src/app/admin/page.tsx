"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { AdminSession } from "@/types/admin";

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/session", { cache: "no-store" }).then(async (response) => {
      if (!active) return;
      if (!response.ok) { setSession(null); return; }
      const body = await response.json() as { session: AdminSession };
      setSession(body.session);
    }).catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/admin/login");
  }, [router, session]);

  if (!session) return <main aria-label="Verificando acesso administrativo" />;
  return <AdminDashboard session={session} onExit={() => router.replace("/admin/login")} />;
}
