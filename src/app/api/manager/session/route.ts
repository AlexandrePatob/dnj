import { NextResponse } from "next/server";
import { hasOperationalRole, readOperationalToken, validateAccessToken } from "@/lib/operational-auth";

const cookieName = "dnj_manager_access";
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 8 };

async function session(accessToken: string) {
  const { response, identity } = await validateAccessToken(accessToken);
  if (!response.ok || !hasOperationalRole(identity, "EVENT_MANAGER") || !identity?.user?.email) {
    console.warn("Manager session validation failed", { upstreamStatus: response.status, role: identity?.user?.role, hasEmail: Boolean(identity?.user?.email) });
    return null;
  }
  return { email: identity.user.email, name: identity.user.name ?? identity.user.email, scope: undefined };
}

export async function GET() {
  const token = await readOperationalToken(cookieName);
  const current = token ? await session(token) : null;
  return current ? NextResponse.json({ manager: current, ...current }) : NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { accessToken?: unknown } | null;
  if (typeof body?.accessToken !== "string") return NextResponse.json({ error: "Token de acesso inválido." }, { status: 401 });
  const current = await session(body.accessToken);
  if (!current) return NextResponse.json({ error: "Acesso de gestor não autorizado." }, { status: 403 });
  const response = NextResponse.json({ manager: current, ...current });
  response.cookies.set(cookieName, body.accessToken, cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
