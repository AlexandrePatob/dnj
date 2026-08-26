import { NextResponse } from "next/server";
import { currentDnjEventId } from "@/lib/dnj-event";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbUser = { id: string; email: string | null; display_name: string; points: number; role: "DEFAULT" | "EVENT_MANAGER" | "ADMIN"; group_id: string | null; created_at: string; updated_at: string };
type DbGroup = { id: string; name: string };

export async function POST(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const body = await request.json().catch(() => null) as { groupId?: unknown } | null;
  const groupId = typeof body?.groupId === "string" && body.groupId ? body.groupId : null;
  if (groupId) {
    const eventId = await currentDnjEventId();
    const [group] = await supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", id: `eq.${groupId}`, event_id: `eq.${eventId}`, limit: 1 })}`);
    if (!group) return NextResponse.json({ code: "GROUP_NOT_FOUND", message: "Grupo não encontrado." }, { status: 404 });
  }
  const [user] = await supabaseRest<DbUser[]>(`test_users?${query({ id: `eq.${userId}` })}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ group_id: groupId, last_seen_at: new Date().toISOString() }) });
  if (!user) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Participante não encontrado." }, { status: 401 });
  const group = user.group_id ? (await supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", id: `eq.${user.group_id}`, limit: 1 })}`))[0] : null;
  return NextResponse.json({ id: user.id, email: user.email ?? "", name: user.display_name, mobilePhone: "", document: "", role: user.role, group: group ? { id: group.id, groupName: group.name } : null, points: user.points, rankPosition: 0, createdAt: user.created_at, updatedAt: user.updated_at });
}
