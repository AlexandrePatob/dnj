import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { toParticipation, type ParticipationRow } from "@/lib/participation-response";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const participations = await supabaseRest<(ParticipationRow & { moments: { id: string }[] | null })[]>(`participations?${query({ select: "id,checked_in_at,cooldown_ends_at,status,can_share_moment,check_in_points,events(id,name),experiences(id,name,spaces(id,name)),moments(id)", user_id: `eq.${userId}`, status: "eq.active", can_share_moment: "eq.true", cooldown_ends_at: `gt.${new Date().toISOString()}`, order: "checked_in_at.desc", limit: 10 })}`);
  const participation = participations.find((item) => !item.moments?.length);
  if (!participation) return new Response(null, { status: 204 });
  return NextResponse.json({ participation: toParticipation(participation) });
}
