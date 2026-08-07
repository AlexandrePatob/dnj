import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";

type ExperienceKind = "stand" | "activity" | "moment_challenge";
const kinds: ExperienceKind[] = ["stand", "activity", "moment_challenge"];

async function authorized() {
  return Boolean(
    verifyAdminCookie((await cookies()).get(adminCookie.name)?.value),
  );
}

export async function GET(request: Request) {
  if (!(await authorized()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind");
  try {
    const experiences = await supabaseRest<Array<Record<string, unknown>>>(
      `experiences?${query({
        select:
          "id,event_id,space_id,slug,name,description,kind,starts_at,ends_at,check_in_points,moment_points,moment_duration_minutes,cooldown_seconds,allows_moment,status,spaces(name)",
        ...(kind && kinds.includes(kind as ExperienceKind)
          ? { kind: `eq.${kind}` }
          : {}),
        order: "created_at.desc",
        limit: 100,
      })}`,
    );
    return NextResponse.json({ experiences });
  } catch {
    return NextResponse.json(
      { error: "Experiências indisponíveis." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await authorized()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    kind?: string;
    points?: number;
    momentPoints?: number;
    durationMinutes?: number;
    startsAt?: string;
    endsAt?: string;
  };
  const name = body.name?.trim();
  const kind = body.kind as ExperienceKind;
  const durationMinutes = body.durationMinutes ?? 5;
  if (
    !name ||
    !kinds.includes(kind) ||
    !Number.isInteger(body.points ?? 0) ||
    (body.points ?? 0) < 0 ||
    !Number.isInteger(body.momentPoints ?? 0) ||
    (body.momentPoints ?? 0) < 0 ||
    (kind === "moment_challenge" &&
      (!Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 180))
  )
    return NextResponse.json(
      { error: "Dados da experiência inválidos." },
      { status: 400 },
    );
  try {
    const [event] = await supabaseRest<Array<{ id: string }>>(
      `events?${query({ select: "id", status: "in.(active,draft,paused)", order: "starts_at.asc", limit: 1 })}`,
    );
    if (!event)
      return NextResponse.json(
        { error: "Nenhum evento DNJ disponível." },
        { status: 409 },
      );
    const slug = `${kind}-${name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
    const [experience] = await supabaseRest<Array<Record<string, unknown>>>(
      "experiences",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          event_id: event.id,
          slug,
          name,
          description: body.description?.trim() || null,
          kind,
          starts_at: body.startsAt || null,
          ends_at: body.endsAt || null,
          check_in_points: body.points ?? 0,
          moment_points: body.momentPoints ?? 0,
          moment_duration_minutes:
            kind === "moment_challenge" ? durationMinutes : null,
          allows_moment: kind === "moment_challenge",
          status: "draft",
        }),
      },
    );
    return NextResponse.json({ experience }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar a experiência." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await authorized()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
  };
  if (
    !body.id ||
    !["draft", "active", "paused", "completed"].includes(body.status ?? "")
  )
    return NextResponse.json(
      { error: "Atualização inválida." },
      { status: 400 },
    );
  try {
    const [experience] = await supabaseRest<
      Array<{
        id: string;
        kind: ExperienceKind;
        status: string;
        moment_duration_minutes: number | null;
        ends_at: string | null;
      }>
    >(
      `experiences?${query({ select: "id,kind,status,moment_duration_minutes,ends_at", id: `eq.${body.id}`, limit: 1 })}`,
    );
    if (!experience)
      return NextResponse.json(
        { error: "Experiência não encontrada." },
        { status: 404 },
      );
    if (experience.kind !== "moment_challenge")
      return NextResponse.json(
        { error: "Apenas desafios de Momento podem ser iniciados aqui." },
        { status: 409 },
      );
    const canStart =
      ["draft", "paused"].includes(experience.status) ||
      (experience.status === "active" &&
        !!experience.ends_at &&
        new Date(experience.ends_at).getTime() <= Date.now());
    if (body.status === "active" && !canStart)
      return NextResponse.json(
        { error: "O desafio não pode ser iniciado neste estado." },
        { status: 409 },
      );
    if (body.status === "active" && !experience.moment_duration_minutes)
      return NextResponse.json(
        { error: "Defina a duração do desafio antes de iniciar." },
        { status: 409 },
      );
    const now = new Date();
    const update =
      body.status === "active"
        ? {
            status: "active",
            starts_at: now.toISOString(),
            ends_at: new Date(
              now.getTime() + experience.moment_duration_minutes! * 60_000,
            ).toISOString(),
          }
        : { status: body.status };
    await supabaseRest(`experiences?${query({ id: `eq.${experience.id}` })}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(update),
    });
    return NextResponse.json({ ok: true, status: body.status });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível atualizar a experiência." },
      { status: 503 },
    );
  }
}
