import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, createAdminCookie, verifyAdminCookie } from "@/lib/admin-session";

export async function GET() {
  const value = (await cookies()).get(adminCookie.name)?.value;
  const session = verifyAdminCookie(value);
  return session ? NextResponse.json({ session: { email: session.email, name: "Administração DNJ" } }) : NextResponse.json({ error: "Não autorizado" }, { status: 401 });
}

export async function POST(request: Request) {
  const { email, password } = await request.json() as { email?: string; password?: string };
  if (!email || !password || email.trim().toLowerCase() !== process.env.ADMIN_EMAIL?.trim().toLowerCase() || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  const response = NextResponse.json({ session: { email: process.env.ADMIN_EMAIL, name: "Administração DNJ" } });
  response.cookies.set(adminCookie.name, createAdminCookie(process.env.ADMIN_EMAIL!), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: adminCookie.maxAge });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookie.name, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
