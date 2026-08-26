import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";

async function authorized() { return Boolean(verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)); }

export async function GET() {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const [managers, spaces] = await Promise.all([
      supabaseRest<Array<{ id: string; display_name: string; email: string | null; role: string; is_active: boolean; manager_scopes: Array<{ scope: string; space_id: string | null; spaces: { name: string } | null }> | null }>>(`test_users?${query({ select: "id,display_name,email,role,is_active,manager_scopes(scope,space_id,spaces(name))", role: "eq.EVENT_MANAGER", order: "display_name.asc" })}`),
      supabaseRest<Array<{ id: string; name: string }>>(`spaces?${query({ select: "id,name", order: "name.asc" })}`),
    ]);
    return NextResponse.json({ managers: managers.map((manager) => ({ ...manager, scopes: manager.manager_scopes ?? [] })), spaces });
  } catch { return NextResponse.json({ error: "Gestores indisponíveis." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { userId?: string; active?: boolean };
  if (!body.userId || body.active === undefined) return NextResponse.json({ error: "Alteração de gestor inválida." }, { status: 400 });
  try {
    await supabaseRest(`test_users?${query({ id: `eq.${body.userId}` })}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: body.active }) });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Não foi possível atualizar o gestor." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { name?: string; email?: string; password?: string; scope?: "space_timer" | "radicality" | "special_events"; spaceId?: string };
  const name = body.name?.trim(); const email = body.email?.trim().toLowerCase();
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || !body.password || body.password.length < 8 || !["space_timer", "radicality", "special_events"].includes(body.scope ?? "") || (body.scope === "space_timer" && !body.spaceId)) return NextResponse.json({ error: "Dados e escopo do gestor inválidos." }, { status: 400 });
  try {
    const manager = await supabaseRest<{ id: string; email: string; name: string }>("rpc/dnj_admin_upsert_manager", { method: "POST", body: JSON.stringify({ p_email: email, p_name: name, p_password: body.password, p_scope: body.scope, p_space_id: body.scope === "space_timer" ? body.spaceId : null }) });
    return NextResponse.json({ manager }, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível criar o gestor." }, { status: 503 }); }
}
