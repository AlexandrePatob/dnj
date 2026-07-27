import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function GET() {
  if (!verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const [users, posts, events] = await Promise.all([
      supabaseRest<Array<{ points: number; last_seen_at: string }>>(`test_users?${query({ select: "points,last_seen_at", is_active: "eq.true", order: "last_seen_at.desc" })}`),
      supabaseRest<Array<{ moderation_status: string }>>(`gallery_posts?${query({ select: "moderation_status", moderation_status: "eq.pending" })}`),
      supabaseRest<Array<{ event_type: string; created_at: string }>>(`operation_events?${query({ select: "event_type,created_at", order: "created_at.desc", limit: 6 })}`),
    ]);
    const cutoff = Date.now() - 15 * 60 * 1000;
    return NextResponse.json({ activeUsers: users.filter((user) => new Date(user.last_seen_at).getTime() >= cutoff).length, ranking: users.sort((a, b) => b.points - a.points).slice(0, 10), pendingModeration: posts.length, interactionsToday: events.filter((event) => new Date(event.created_at).toDateString() === new Date().toDateString()).length, activity: events });
  } catch {
    return NextResponse.json({ error: "Dados operacionais indisponíveis." }, { status: 503 });
  }
}
