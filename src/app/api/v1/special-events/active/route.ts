import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";
type Row = { id: string; title: string; starts_at: string; ends_at: string; teaser_seconds: number; teaser_started_at: string | null; points: number; delivery_targets: string[]; status: "teaser" | "active" };
type ChallengeRow = { id: string; name: string; description: string | null; ends_at: string; moment_points: number };

export async function GET(request: Request) {
  const now = new Date().toISOString();
  const [rows, challenges] = await Promise.all([
    supabaseRest<Row[]>(`special_events?${query({ select: "id,title,starts_at,ends_at,teaser_seconds,teaser_started_at,points,delivery_targets,status", status: "in.(teaser,active)", order: "created_at.desc", limit: 1 })}`),
    supabaseRest<ChallengeRow[]>(`experiences?${query({ select: "id,name,description,ends_at,moment_points", kind: "eq.moment_challenge", status: "eq.active", ends_at: `gt.${now}`, order: "starts_at.desc", limit: 1 })}`),
  ]);
  const event = rows[0];
  const challenge = challenges[0];
  const userId = participantIdFrom(request);
  const [challengeParticipation] = challenge && userId
    ? await supabaseRest<Array<{ moments: { id: string }[] | null }>>(`participations?${query({ select: "moments(id)", user_id: `eq.${userId}`, experience_id: `eq.${challenge.id}`, limit: 1 })}`)
    : [];
  const challengeAvailable = Boolean(challenge && !challengeParticipation?.moments?.length);
  const ready = Boolean(event && (event.status === "active" || (event.teaser_started_at && Date.now() >= new Date(event.teaser_started_at).getTime() + event.teaser_seconds * 1000)));
  return NextResponse.json({
    event: event && new Date(event.ends_at).getTime() >= Date.now() ? { id: event.id, title: event.title, status: ready ? "active" : "teaser", startsAt: event.starts_at, endsAt: event.ends_at, teaserSeconds: event.teaser_seconds, points: event.points, targets: event.delivery_targets, qrAvailableAt: event.teaser_started_at ? new Date(new Date(event.teaser_started_at).getTime() + event.teaser_seconds * 1000).toISOString() : null, qrExpiresAt: event.ends_at } : null,
    momentChallenge: challengeAvailable ? { id: challenge.id, title: challenge.name, description: challenge.description, endsAt: challenge.ends_at, points: challenge.moment_points } : null,
  });
}
