import { NextResponse } from "next/server";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbExperience = { id: string; name: string; description: string | null; starts_at: string; ends_at: string; spaces: { id: string; name: string; slug: string } | null };
type ScheduleState = "live" | "upcoming" | "scheduled" | "ended";

function stateFor(startsAt: string, endsAt: string, now: Date): ScheduleState {
  if (now >= new Date(startsAt) && now < new Date(endsAt)) return "live";
  if (now < new Date(startsAt) && new Date(startsAt).getTime() - now.getTime() <= 15 * 60_000) return "upcoming";
  return now < new Date(startsAt) ? "scheduled" : "ended";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = url.searchParams.get("at") ? new Date(url.searchParams.get("at")!) : new Date();
  if (Number.isNaN(now.getTime())) return NextResponse.json({ code: "INVALID_TIME", message: "Horário de referência inválido." }, { status: 400 });
  const sector = url.searchParams.get("sector")?.trim();
  const view = url.searchParams.get("view");
  const rows = await supabaseRest<DbExperience[]>(`experiences?${query({ select: "id,name,description,starts_at,ends_at,spaces(id,name,slug)", kind: "eq.schedule", status: "eq.active", order: "starts_at.asc" })}`);
  const items = rows.filter((item) => !sector || item.spaces?.slug === sector).map((item) => ({ id: item.id, title: item.name, description: item.description, startsAt: item.starts_at, endsAt: item.ends_at, sector: item.spaces ? { id: item.spaces.id, name: item.spaces.name, slug: item.spaces.slug } : null, state: stateFor(item.starts_at, item.ends_at, now) }));
  const visible = view === "home" ? (() => { const timely = items.filter((item) => item.state === "live" || item.state === "upcoming"); return timely.length ? timely : items.filter((item) => item.state !== "ended").slice(0, 3); })() : items;
  return NextResponse.json({ items: visible, generatedAt: now.toISOString() });
}

