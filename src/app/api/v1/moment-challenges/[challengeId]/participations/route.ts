import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { toParticipation, type ParticipationRow } from "@/lib/participation-response";
import { query, supabaseRest } from "@/lib/supabase-server";

type Challenge = {
  id: string;
  event_id: string;
  name: string;
  status: string;
  ends_at: string | null;
};

function invalid(message: string) {
  return NextResponse.json({ code: "MOMENT_NOT_ELIGIBLE", message }, { status: 409 });
}

function challengeKey(userId: string, challengeId: string) {
  const hash = createHash("md5").update(`${userId}:${challengeId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> },
) {
  const userId = participantIdFrom(request);
  if (!userId)
    return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const { challengeId } = await params;
  const [challenge] = await supabaseRest<Challenge[]>(`experiences?${query({ select: "id,event_id,name,status,ends_at", id: `eq.${challengeId}`, kind: "eq.moment_challenge", limit: 1 })}`);
  if (!challenge) return invalid("Este desafio não está disponível.");
  if (challenge.status !== "active" || !challenge.ends_at || new Date(challenge.ends_at).getTime() <= Date.now())
    return invalid("O tempo deste desafio já terminou.");

  const select = "id,checked_in_at,cooldown_ends_at,status,can_share_moment,check_in_points,events(id,name),experiences(id,name,spaces(id,name))";
  let [participation] = await supabaseRest<ParticipationRow[]>(`participations?${query({ select, user_id: `eq.${userId}`, experience_id: `eq.${challenge.id}`, order: "created_at.asc", limit: 1 })}`);
  if (!participation) {
    const inserted = await supabaseRest<ParticipationRow[]>("participations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, event_id: challenge.event_id, experience_id: challenge.id, cooldown_ends_at: challenge.ends_at, can_share_moment: true, check_in_points: 0, idempotency_key: challengeKey(userId, challenge.id) }),
    });
    participation = inserted[0];
  }
  const [moment] = await supabaseRest<Array<{ id: string }>>(`moments?${query({ select: "id", participation_id: `eq.${participation.id}`, limit: 1 })}`);
  if (moment) return NextResponse.json({ alreadySubmitted: true });
  return NextResponse.json({ participation: toParticipation(participation) });
}
