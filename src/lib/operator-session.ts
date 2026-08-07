import { createHmac, timingSafeEqual } from "node:crypto";

export type ManagerScope = "space_timer" | "radicality" | "special_events";
type Payload = { sub: string; email: string; name: string; scope: ManagerScope; exp: number };

export const managerCookie = { name: "dnj_manager_session", maxAge: 60 * 60 * 8 };
function secret() { const value = process.env.MANAGER_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? process.env.HOMOLOGATION_SESSION_SECRET; if (!value) throw new Error("Sessão de gestor não configurada."); return value; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export function createManagerCookie(session: Omit<Payload, "exp">) {
  const body = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + managerCookie.maxAge * 1000 })).toString("base64url");
  return `${body}.${sign(body)}`;
}
export function readManagerCookie(value?: string): Payload | null {
  if (!value) return null;
  const [body, received, extra] = value.split(".");
  if (!body || !received || extra) return null;
  const expected = sign(body);
  if (expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return null;
  try { const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload; return parsed.exp > Date.now() && typeof parsed.sub === "string" && ["space_timer", "radicality", "special_events"].includes(parsed.scope) ? parsed : null; } catch { return null; }
}
export function managerFromRequest(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${managerCookie.name}=`))?.slice(managerCookie.name.length + 1);
  return readManagerCookie(value);
}
