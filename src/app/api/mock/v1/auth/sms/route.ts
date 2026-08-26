import { NextResponse } from "next/server";

export const SIMULATED_SMS_CODE = "123456";

function validRequest(value: unknown): value is { email: string; document: string } {
  if (!value || typeof value !== "object") return false;
  const { email, document } = value as { email?: unknown; document?: unknown };
  return typeof email === "string" && email.includes("@") && typeof document === "string" && document.replace(/\D/g, "").length === 11;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!validRequest(body)) return NextResponse.json({ message: "Informe e-mail e CPF válidos para a homologação." }, { status: 400 });

  return NextResponse.json({
    channel: "sms",
    verificationCode: SIMULATED_SMS_CODE,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  });
}
