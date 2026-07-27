import { NextResponse } from "next/server";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const { externalKey, subscription } = await request.json() as { externalKey?: string; subscription?: PushSubscriptionJSON };
  if (!externalKey || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });
  try {
    const users = await supabaseRest<Array<{ id: string }>>(`test_users?${query({ select: "id", external_key: `eq.${externalKey}`, limit: 1 })}`);
    if (!users[0]) return NextResponse.json({ error: "Participante não encontrado." }, { status: 404 });
    await supabaseRest(`push_subscriptions?${query({ on_conflict: "endpoint" })}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: users[0].id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, updated_at: new Date().toISOString() }) });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Não foi possível ativar notificações." }, { status: 503 }); }
}
