import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eventId, manager, supabaseRest } from "@/lib/manager-api";

export async function POST(request: Request) {
  const auth = manager(request, "special_events"); if ("error" in auth) return auth.error;
  const body = await request.json().catch(() => null) as { title?: unknown; description?: unknown; points?: unknown; durationMinutes?: unknown; targets?: unknown } | null;
  if (typeof body?.title !== "string" || !body.title.trim() || body.title.trim().length > 100) return Response.json({ error: "Informe o nome do evento." }, { status: 400 });
  const points = typeof body.points === "number" && Number.isInteger(body.points) && body.points >= 0 ? body.points : 0;
  const duration = typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes) && body.durationMinutes > 0 ? Math.min(body.durationMinutes, 180) : 15;
  const id = await eventId(); if (!id) return Response.json({ error: "Evento não configurado." }, { status: 503 });
  const now = new Date(); const endsAt = new Date(now.getTime() + duration * 60_000).toISOString();
  const [experience] = await supabaseRest<Array<{ id: string }>>("experiences", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ event_id: id, slug: `especial-${randomUUID()}`, name: body.title.trim(), description: typeof body.description === "string" ? body.description.slice(0, 180) : null, kind: "special", starts_at: now.toISOString(), ends_at: endsAt, check_in_points: points, allows_moment: false, status: "active" }) });
  if (!experience) return Response.json({ error: "Não foi possível preparar o evento." }, { status: 503 });
  const targets = Array.isArray(body.targets) && body.targets.length && body.targets.every((value) => value === "app" || value === "tv" || value === "screen") ? body.targets : ["app"];
  const [event] = await supabaseRest<Array<{ id: string; title: string; teaser_seconds: number }>>("special_events", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ event_id: id, experience_id: experience.id, title: body.title.trim(), starts_at: now.toISOString(), ends_at: endsAt, points, delivery_targets: targets, status: "draft", created_by: auth.session.sub }) });
  if (!event) return Response.json({ error: "Não foi possível criar o evento." }, { status: 503 });
  return NextResponse.json({ event: { ...event, expiresAt: endsAt, targets } }, { status: 201 });
}
