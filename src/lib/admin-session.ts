import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "dnj_admin_session";
const maxAge = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET não configurado.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminCookie(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt: Date.now() + maxAge * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminCookie(value?: string) {
  if (!value) return null;
  const [payload, receivedSignature] = value.split(".");
  if (!payload || !receivedSignature) return null;
  const expectedSignature = signature(payload);
  if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email: string; expiresAt: number };
    return session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}

export const adminCookie = { name: cookieName, maxAge };
