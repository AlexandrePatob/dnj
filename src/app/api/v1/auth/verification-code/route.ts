import { NextResponse } from "next/server";
import { createParticipantToken } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";
import { SIMULATED_SMS_CODE } from "../sms/route";

type DbUser = { id: string; email: string | null; display_name: string; points: number; role: "DEFAULT" | "EVENT_MANAGER" | "ADMIN"; group_id: string | null; created_at: string; updated_at: string };
type DbGroup = { id: string; name: string };

function validRequest(value: unknown): value is { email: string; document: string; verificationCode: string } {
  if (!value || typeof value !== "object") return false;
  const { email, document, verificationCode } = value as { email?: unknown; document?: unknown; verificationCode?: unknown };
  return typeof email === "string" && email.includes("@") && typeof document === "string" && document.replace(/\D/g, "").length === 11 && typeof verificationCode === "string";
}

function nameFrom(email: string) {
  const value = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return value ? value.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Participante DNJ";
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_AUTH_SIMULATION !== "true") return NextResponse.json({ message: "Simulação de SMS indisponível." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  if (!validRequest(body)) return NextResponse.json({ message: "Dados de verificação inválidos." }, { status: 400 });
  if (body.verificationCode !== SIMULATED_SMS_CODE) return NextResponse.json({ message: "Código SMS inválido. Use o código exibido na homologação." }, { status: 401 });

  const document = body.document.replace(/\D/g, "");
  const [user] = await supabaseRest<DbUser[]>(`test_users?${query({ on_conflict: "external_key" })}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ external_key: document, email: body.email.trim().toLowerCase(), display_name: nameFrom(body.email), is_active: true, last_seen_at: new Date().toISOString() }),
  });
  if (!user) return NextResponse.json({ message: "Não foi possível criar a sessão." }, { status: 503 });
  const group = user.group_id ? (await supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", id: `eq.${user.group_id}`, limit: 1 })}`))[0] : null;
  return NextResponse.json({
    id: user.id,
    email: user.email ?? body.email,
    name: user.display_name,
    mobilePhone: "",
    document,
    role: user.role,
    group: group ? { id: group.id, groupName: group.name } : null,
    points: user.points,
    rankPosition: 0,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    identityToken: createParticipantToken(user.id),
  });
}

