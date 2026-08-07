import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createManagerCookie, managerCookie, readManagerCookie, type ManagerScope } from "@/lib/operator-session";
import { uiScope } from "@/lib/manager-api";
import { supabaseRest } from "@/lib/supabase-server";

type LoginRow = { user_id: string; display_name: string; scopes: ManagerScope[] };
function view(session: { email: string; name: string; scope: ManagerScope }) { return { manager: { email: session.email, name: session.name, scope: uiScope(session.scope) }, email: session.email, name: session.name, scope: uiScope(session.scope) }; }

export async function GET() {
  const session = readManagerCookie((await cookies()).get(managerCookie.name)?.value);
  return session ? NextResponse.json(view(session)) : NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  const rows = await supabaseRest<LoginRow[]>("rpc/dnj_operator_login", { method: "POST", body: JSON.stringify({ p_email: body.email, p_password: body.password }) });
  const row = rows[0];
  if (!row?.scopes?.[0]) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  const scope = row.scopes[0];
  const session = { sub: row.user_id, email: body.email.trim().toLowerCase(), name: row.display_name, scope };
  const response = NextResponse.json(view(session));
  response.cookies.set(managerCookie.name, createManagerCookie(session), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: managerCookie.maxAge });
  return response;
}
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(managerCookie.name, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
