import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { pushClient } from "@/lib/push-server";
import { query, supabaseRest } from "@/lib/supabase-server";

async function authorized() { return Boolean(verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)); }
export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { title, body, target = "all" } = await request.json() as { title?: string; body?: string; target?: "all" | "active" };
  if (!title?.trim() || !body?.trim() || title.length > 80 || body.length > 280) return NextResponse.json({ error: "Preencha título e mensagem." }, { status: 400 });
  try {
    const subscriptions = await supabaseRest<Array<{ endpoint: string; p256dh: string; auth: string }>>(`push_subscriptions?${query({ select: "endpoint,p256dh,auth" })}`);
    const push = pushClient();
    const result = await Promise.allSettled(subscriptions.map((item) => push.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, JSON.stringify({ title: title.trim(), body: body.trim(), url: "/" }))));
    const delivered = result.filter((item) => item.status === "fulfilled").length;
    await supabaseRest("notification_campaigns", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ title: title.trim(), body: body.trim(), target, sent_at: new Date().toISOString() }) });
    return NextResponse.json({ delivered, total: subscriptions.length });
  } catch { return NextResponse.json({ error: "Não foi possível enviar a notificação." }, { status: 503 }); }
}
