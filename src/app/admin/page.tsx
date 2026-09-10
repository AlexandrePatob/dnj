"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { authApi } from "@/lib/api/auth";
import type { AdminSession } from "@/types/admin";

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      let response = await fetch("/api/admin/session", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        try {
          const identity = await authApi.refresh();
          response = await fetch("/api/admin/session", {
            method: "POST",
            cache: "no-store",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: identity.accessToken }),
          });
        } catch {
          // The refresh token is unavailable or expired; login is required.
        }
      }
      if (!active) return;
      if (!response.ok) { setSession(null); return; }
      const body = await response.json() as { session: AdminSession };
      setSession(body.session);
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
