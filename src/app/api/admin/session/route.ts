import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, createAdminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { supabaseRest } from "@/lib/supabase-server";

export async function GET() {
  const value = (await cookies()).get(adminCookie.name)?.value;
  const session = verifyAdminCookie(value);
  return session ? NextResponse.json({ session: { email: session.email, name: "Administração DNJ" } }) : NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

export async function POST(request: Request) {
  const { email, password, accessToken } = await request.json().catch(() => ({})) as { email?: string; password?: string; accessToken?: string };
  if (accessToken) {
    const upstream = (process.env.DNJ_V2_UPSTREAM_URL ?? "https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2").replace(/\/$/, "");
    const identityResponse = await fetch(`${upstream}/auth/session`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const identity = await identityResponse.json().catch(() => null) as { user?: { email?: string; role?: string } } | null;
    if (!identityResponse.ok || identity?.user?.role !== "ADMIN" || !identity.user.email) return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 });
    const response = NextResponse.json({ session: { email: identity.user.email, name: "Administração DNJ" } });
    response.cookies.set(adminCookie.name, createAdminCookie(identity.user.email), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: adminCookie.maxAge });
    return response;
  }
  if (!email || !password) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  const session = await supabaseRest<{ email: string; display_name: string } | null>("rpc/dnj_admin_login", { method: "POST", body: JSON.stringify({ p_email: email, p_password: password }) });
  if (!session?.email) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  const response = NextResponse.json({ session: { email: session.email, name: session.display_name } });
  response.cookies.set(adminCookie.name, createAdminCookie(session.email), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: adminCookie.maxAge });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
