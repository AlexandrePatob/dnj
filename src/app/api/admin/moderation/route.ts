import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";

type ModerationPost = { id: string; caption: string | null; created_at: string; image_path: string; test_users: { display_name: string } | null };

async function isAdmin() {
  return Boolean(verifyAdminCookie((await cookies()).get(adminCookie.name)?.value));
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const posts = await supabaseRest<ModerationPost[]>(`gallery_posts?${query({ select: "id,caption,created_at,image_path,test_users(display_name)", moderation_status: "eq.pending", order: "created_at.desc", limit: 50 })}`);
    return NextResponse.json({ posts });
  } catch { return NextResponse.json({ error: "Fila de moderação indisponível." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id, decision } = await request.json() as { id?: string; decision?: "approved" | "rejected" };
  if (!id || (decision !== "approved" && decision !== "rejected")) return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
  try {
    await supabaseRest(`gallery_posts?${query({ id: `eq.${id}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ moderation_status: decision, moderated_at: new Date().toISOString(), moderated_by: "admin" }) });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Não foi possível atualizar a publicação." }, { status: 503 }); }
}
