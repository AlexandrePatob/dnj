import { NextResponse } from "next/server";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const body = await request.json() as { externalKey?: string; name?: string; email?: string; points?: number };
  if (!body.externalKey || !body.name || body.externalKey.length > 180 || body.name.length > 120) return NextResponse.json({ error: "Dados de presença inválidos." }, { status: 400 });
  try {
    const [user] = await supabaseRest<Array<{ id: string }>>(`test_users?${query({ on_conflict: "external_key" })}`, {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ external_key: body.externalKey, display_name: body.name, email: body.email ?? null, points: Math.max(0, Math.floor(body.points ?? 0)), is_active: true, last_seen_at: new Date().toISOString() }),
    });
    await supabaseRest("operation_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: user.id, event_type: "login", subject_type: "session" }) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a presença." }, { status: 503 });
  }
}
