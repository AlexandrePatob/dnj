import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { token, tokenHash } from "@/lib/manager-api";
import { qrImageUrl } from "@/lib/manager-qr";
import { query, supabaseRest } from "@/lib/supabase-server";

async function authorized() { return Boolean(verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)); }

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const events = await supabaseRest<Array<Record<string, unknown>>>(`special_events?${query({ select: "id,title,starts_at,ends_at,teaser_seconds,points,status,delivery_targets,created_at,experiences(name)", order: "created_at.desc", limit: 100 })}`);
    return NextResponse.json({ events });
  } catch { return NextResponse.json({ error: "Eventos especiais indisponíveis." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { title?: string; durationMinutes?: number; points?: number; teaserSeconds?: number; targets?: unknown };
  const title = body.title?.trim();
  const startsAt = new Date();
  const endsAt = Number.isInteger(body.durationMinutes) && body.durationMinutes! > 0 && body.durationMinutes! <= 180 ? new Date(startsAt.getTime() + body.durationMinutes! * 60_000) : null;
  const targets = Array.isArray(body.targets) && body.targets.every((target) => typeof target === "string" && ["app", "tv", "screen"].includes(target)) && body.targets.length ? [...new Set(body.targets)] : ["app"];
  if (!title || !endsAt || !Number.isInteger(body.points ?? 0) || (body.points ?? 0) < 0 || !Number.isInteger(body.teaserSeconds ?? 15) || (body.teaserSeconds ?? 15) < 0) return NextResponse.json({ error: "Dados do evento especial inválidos." }, { status: 400 });
  try {
    const [event] = await supabaseRest<Array<{ id: string }>>(`events?${query({ select: "id", order: "starts_at.asc", limit: 1 })}`);
    if (!event) return NextResponse.json({ error: "Evento DNJ não encontrado." }, { status: 409 });
    const slug = `especial-${title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const [experience] = await supabaseRest<Array<{ id: string }>>("experiences", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ event_id: event.id, slug, name: title, kind: "special", starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), check_in_points: body.points ?? 0, allows_moment: false, status: "draft" }) });
    const [specialEvent] = await supabaseRest<Array<{ id: string }>>("special_events", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ event_id: event.id, experience_id: experience.id, title, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), points: body.points ?? 0, teaser_seconds: body.teaserSeconds ?? 15, delivery_targets: targets, status: "draft" }) });
    const qrPayload = token();
    await supabaseRest("qr_codes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ experience_id: experience.id, special_event_id: specialEvent.id, token_hash: tokenHash(qrPayload), expiration_time: endsAt.toISOString(), expiration_momento_time: null, status: "disabled" }) });
    await supabaseRest(`special_events?${query({ id: `eq.${specialEvent.id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ display_qr_payload: qrPayload }) });
    return NextResponse.json({ event: specialEvent }, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível criar o evento especial." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; status?: "draft" | "teaser" | "active" | "completed" | "cancelled" };
  if (!body.id || !["draft", "teaser", "active", "completed", "cancelled"].includes(body.status ?? "")) return NextResponse.json({ error: "Estado do evento inválido." }, { status: 400 });
  try {
    const [event] = await supabaseRest<Array<{ id: string; experience_id: string; status: string; teaser_started_at: string | null; teaser_seconds: number; ends_at: string; display_qr_payload: string | null }>>(`special_events?${query({ select: "id,experience_id,status,teaser_started_at,teaser_seconds,ends_at,display_qr_payload", id: `eq.${body.id}`, limit: 1 })}`);
    if (!event) return NextResponse.json({ error: "Evento especial não encontrado." }, { status: 404 });
    if (body.status === "teaser") {
      if (event.status !== "draft") return NextResponse.json({ error: "O teaser só pode iniciar em um evento rascunho." }, { status: 409 });
      await supabaseRest(`special_events?${query({ id: `eq.${event.id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "teaser", teaser_started_at: new Date().toISOString() }) });
      await supabaseRest(`qr_codes?${query({ special_event_id: `eq.${event.id}`, status: "eq.disabled" })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "active" }) });
      return NextResponse.json({ ok: true, status: "teaser" });
    }
    if (body.status === "active") {
      if (event.status !== "teaser" && event.status !== "active") return NextResponse.json({ error: "O QR só pode abrir após o teaser." }, { status: 409 });
      if (event.status === "teaser" && (!event.teaser_started_at || Date.now() < new Date(event.teaser_started_at).getTime() + event.teaser_seconds * 1000)) return NextResponse.json({ error: "Aguarde o teaser antes de abrir o QR." }, { status: 409 });
      if (event.display_qr_payload) {
        await supabaseRest(`special_events?${query({ id: `eq.${event.id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "active" }) });
        return NextResponse.json({ ok: true, status: "active", qrImageUrl: await qrImageUrl(event.display_qr_payload), expiresAt: event.ends_at });
      }
      await supabaseRest(`qr_codes?${query({ special_event_id: `eq.${event.id}`, status: "eq.active" })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "disabled" }) });
      const qrPayload = token();
      const [qr] = await supabaseRest<Array<{ id: string }>>("qr_codes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ experience_id: event.experience_id, special_event_id: event.id, token_hash: tokenHash(qrPayload), expiration_time: event.ends_at, expiration_momento_time: null, status: "active" }) });
      await supabaseRest(`special_events?${query({ id: `eq.${event.id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "active", display_qr_payload: qrPayload }) });
      return NextResponse.json({ ok: true, status: "active", qrId: qr?.id, qrPayload, qrImageUrl: await qrImageUrl(qrPayload), expiresAt: event.ends_at });
    }
    if (body.status === "completed" || body.status === "cancelled") await supabaseRest(`qr_codes?${query({ special_event_id: `eq.${event.id}`, status: "eq.active" })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "disabled" }) });
    await supabaseRest(`special_events?${query({ id: `eq.${event.id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: body.status, display_qr_payload: null }) });
    return NextResponse.json({ ok: true, status: body.status });
  } catch { return NextResponse.json({ error: "Não foi possível atualizar o evento especial." }, { status: 503 }); }
}
