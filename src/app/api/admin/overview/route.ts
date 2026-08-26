import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function GET() {
  if (!verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const [users, posts, challengePosts, events, managers, specialEvents, experiences] = await Promise.all([
      supabaseRest<Array<{ points: number; last_seen_at: string }>>(`test_users?${query({ select: "points,last_seen_at", is_active: "eq.true", order: "last_seen_at.desc" })}`),
      supabaseRest<Array<{ moderation_status: string }>>(`moments?${query({ select: "moderation_status,participations!inner(experiences!inner(kind))", moderation_status: "eq.pending", photo_status: "eq.available", "participations.experiences.kind": "neq.moment_challenge" })}`),
      supabaseRest<Array<{ moderation_status: string }>>(`moments?${query({ select: "moderation_status,participations!inner(experiences!inner(kind))", moderation_status: "eq.pending", photo_status: "eq.available", "participations.experiences.kind": "eq.moment_challenge" })}`),
      supabaseRest<Array<{ event_type: string; created_at: string }>>(`operation_events?${query({ select: "event_type,created_at", order: "created_at.desc", limit: 6 })}`),
      supabaseRest<Array<{ id: string }>>(`test_users?${query({ select: "id", role: "eq.EVENT_MANAGER", is_active: "eq.true" })}`),
      supabaseRest<Array<{ id: string; status: string }>>(`special_events?${query({ select: "id,status", status: "in.(teaser,active)" })}`),
      supabaseRest<Array<{ id: string }>>(`experiences?${query({ select: "id", status: "in.(draft,active,paused)" })}`),
    ]);
    const cutoff = Date.now() - 15 * 60 * 1000;
    return NextResponse.json({ activeUsers: users.filter((user) => new Date(user.last_seen_at).getTime() >= cutoff).length, ranking: users.sort((a, b) => b.points - a.points).slice(0, 10), pendingModeration: posts.length, pendingChallengeModeration: challengePosts.length, activeManagers: managers.length, liveSpecialEvents: specialEvents.length, openExperiences: experiences.length, interactionsToday: events.filter((event) => new Date(event.created_at).toDateString() === new Date().toDateString()).length, activity: events });
  } catch {
    return NextResponse.json({ error: "Dados operacionais indisponíveis." }, { status: 503 });
  }
}
