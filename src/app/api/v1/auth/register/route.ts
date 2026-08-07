import { NextResponse } from "next/server";
import { createParticipantToken } from "@/lib/participant-session";
import { currentDnjEventId } from "@/lib/dnj-event";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbUser = { id: string; email: string | null; display_name: string; points: number; role: "DEFAULT" | "EVENT_MANAGER" | "ADMIN"; group_id: string | null; created_at: string; updated_at: string };
type DbGroup = { id: string; name: string };

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_AUTH_SIMULATION !== "true") return NextResponse.json({ message: "Cadastro de homologação indisponível." }, { status: 404 });
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; mobilePhone?: unknown; group?: unknown } | null;
  if (typeof body?.name !== "string" || !body.name.trim() || typeof body?.email !== "string" || !body.email.includes("@") || typeof body.mobilePhone !== "string") return NextResponse.json({ message: "Informe nome, e-mail e telefone válidos." }, { status: 400 });
  const email = body.email.trim().toLowerCase();
  const groupName = typeof body.group === "string" && body.group !== "Sem grupo de jovens" ? body.group.trim() : "";
  const eventId = groupName ? await currentDnjEventId() : null;
  const group = groupName ? (await supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", event_id: `eq.${eventId}`, name: `eq.${groupName}`, limit: 1 })}`))[0] : null;
  if (groupName && !group) return NextResponse.json({ message: "Grupo não encontrado no DNJ 2K26." }, { status: 404 });
  const [user] = await supabaseRest<DbUser[]>(`test_users?${query({ on_conflict: "external_key" })}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ external_key: `registration:${email}`, email, display_name: body.name.trim(), group_id: group?.id ?? null, is_active: true, last_seen_at: new Date().toISOString() }) });
  if (!user) return NextResponse.json({ message: "Não foi possível criar a conta." }, { status: 503 });
  return NextResponse.json({ id: user.id, email: user.email ?? email, name: user.display_name, mobilePhone: body.mobilePhone, document: "", role: user.role, group: group ? { id: group.id, groupName: group.name } : null, points: user.points, rankPosition: 0, createdAt: user.created_at, updatedAt: user.updated_at, identityToken: createParticipantToken(user.id) });
}
