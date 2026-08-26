import { NextResponse } from "next/server";
import { currentDnjEventId } from "@/lib/dnj-event";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbGroup = { id: string; name: string };
type DbUser = { id: string; display_name: string; points: number; group_id: string | null };
type PointEntry = { id: string; reason: string; delta: number; created_at: string };

const pointLabel = (reason: string) => reason === "qr_checkin" ? "Check-in de atividade" : "Pontos DNJ";

export async function GET(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const eventId = await currentDnjEventId();
  const [groups, users, pointEntries] = await Promise.all([
    supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", event_id: `eq.${eventId}`, order: "name.asc" })}`),
    supabaseRest<DbUser[]>(`test_users?${query({ select: "id,display_name,points,group_id", order: "points.desc", limit: 100 })}`),
    supabaseRest<PointEntry[]>(`point_entries?${query({ select: "id,reason,delta,created_at", user_id: `eq.${userId}`, order: "created_at.desc", limit: 50 })}`),
  ]);
  const groupById = new Map(groups.map((group) => [group.id, group.name]));
  const individual = users.map((participant) => ({ id: participant.id, name: participant.display_name, points: participant.points, group: participant.group_id ? groupById.get(participant.group_id) ?? "Sem grupo" : "Sem grupo", isUser: participant.id === userId }));
  const rankedGroups = groups.map((group) => {
    const members = users.filter((participant) => participant.group_id === group.id);
    return { id: group.id, name: group.name, members: members.length, points: members.reduce((total, participant) => total + participant.points, 0) };
  }).sort((left, right) => right.points - left.points || left.name.localeCompare(right.name));
  const current = individual.find((participant) => participant.isUser);
  return NextResponse.json({ individual, groups: rankedGroups, pointEntries: pointEntries.map((entry) => ({ id: entry.id, label: pointLabel(entry.reason), points: entry.delta, icon: "qr", createdAt: entry.created_at })), current: { groupId: users.find((participant) => participant.id === userId)?.group_id ?? null, rankPosition: current ? individual.findIndex((participant) => participant.id === userId) + 1 : 0 } });
}
