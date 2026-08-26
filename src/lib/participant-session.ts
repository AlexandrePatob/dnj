import { createHmac, timingSafeEqual } from "node:crypto";

const tokenVersion = "v1";
const ttlMs = 12 * 60 * 60 * 1000;

type SessionPayload = { sub: string; exp: number };

function secret() {
  const value = process.env.HOMOLOGATION_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error("Sessão de homologação não configurada.");
  return value;
}

function encode(value: SessionPayload) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createParticipantToken(userId: string, now = Date.now()) {
  const payload = encode({ sub: userId, exp: now + ttlMs });
  const signed = `${tokenVersion}.${payload}`;
  return `${signed}.${sign(signed)}`;
}

export function readParticipantToken(authorization: string | null, now = Date.now()): SessionPayload | null {
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const [version, encoded, signature, extra] = token.split(".");
  if (version !== tokenVersion || !encoded || !signature || extra) return null;
  const expected = sign(`${version}.${encoded}`);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return typeof payload.sub === "string" && typeof payload.exp === "number" && payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

export function participantIdFrom(request: Request) {
  return readParticipantToken(request.headers.get("authorization"))?.sub ?? null;
}

